import { PersistedState } from '@transcend-io/persisted-state';
import {
  checkIfPendingPreferenceUpdatesAreNoOp,
  checkIfPendingPreferenceUpdatesCauseConflict,
  FileMetadataState,
  getPreferencesForIdentifiers,
  getPreferenceUpdatesFromRow,
  PreferenceState,
  type PreferenceTopic,
} from '@transcend-io/sdk';
import colors from 'colors';
import type { Got } from 'got';
import * as t from 'io-ts';
import { keyBy } from 'lodash-es';

import { logger } from '../../logger.js';
import { withProgressBar } from '../helpers/index.js';
import { readCsv } from '../requests/index.js';
import { parsePreferenceAndPurposeValuesFromCsv } from './parsePreferenceAndPurposeValuesFromCsv.js';
import { parsePreferenceIdentifiersFromCsv } from './parsePreferenceIdentifiersFromCsv.js';
import { parsePreferenceTimestampsFromCsv } from './parsePreferenceTimestampsFromCsv.js';

/**
 * Parse a file into the cache
 *
 *
 * @param options - Options
 * @param cache - The cache to store the parsed file in
 * @returns The cache with the parsed file
 */
export async function parsePreferenceManagementCsvWithCache(
  {
    file,
    sombra,
    purposeSlugs,
    preferenceTopics,
    partitionKey,
    skipExistingRecordCheck,
    forceTriggerWorkflows,
  }: {
    /** File to parse */
    file: string;
    /** The purpose slugs that are allowed to be updated */
    purposeSlugs: string[];
    /** The preference topics */
    preferenceTopics: PreferenceTopic[];
    /** Sombra got instance */
    sombra: Got;
    /** Partition key */
    partitionKey: string;
    /** Whether to skip the check for existing records. SHOULD ONLY BE USED FOR INITIAL UPLOAD */
    skipExistingRecordCheck: boolean;
    /** Whether to force workflow triggers */
    forceTriggerWorkflows: boolean;
  },
  cache: PersistedState<typeof PreferenceState>,
): Promise<void> {
  // Start the timer
  const t0 = new Date().getTime();

  // Get the current metadata
  const fileMetadata = cache.getValue('fileMetadata');

  // Read in the file
  logger.info(colors.magenta(`Reading in file: "${file}"`));
  let preferences = readCsv(file, t.record(t.string, t.string));

  // start building the cache, can use previous cache as well
  let currentState: FileMetadataState = {
    columnToPurposeName: {},
    pendingSafeUpdates: {},
    pendingConflictUpdates: {},
    skippedUpdates: {},
    // Load in the last fetched time
    ...((fileMetadata[file] || {}) as Partial<FileMetadataState>),
    lastFetchedAt: new Date().toISOString(),
  };

  // Validate that all timestamps are present in the file
  currentState = await parsePreferenceTimestampsFromCsv(preferences, currentState);
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');

  // Validate that all identifiers are present and unique
  const result = await parsePreferenceIdentifiersFromCsv(preferences, currentState);
  currentState = result.currentState;
  preferences = result.preferences;
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');

  // Ensure all other columns are mapped to purpose and preference
  // slug values
  currentState = await parsePreferenceAndPurposeValuesFromCsv(preferences, currentState, {
    preferenceTopics,
    purposeSlugs,
    forceTriggerWorkflows,
  });
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');

  const identifiers = preferences.map((pref) => pref[currentState.identifierColumn!]);
  const existingConsentRecords = skipExistingRecordCheck
    ? []
    : await withProgressBar(async (bar) => {
        bar.start(identifiers.length);
        return getPreferencesForIdentifiers(sombra, {
          identifiers: identifiers.map((x) => ({ value: x })),
          partitionKey,
          logger,
          onProgress: (completed) => bar.update(completed),
        });
      });
  const consentRecordByIdentifier = keyBy(existingConsentRecords, 'userId');

  // Clear out previous updates
  currentState.pendingConflictUpdates = {};
  currentState.pendingSafeUpdates = {};
  currentState.skippedUpdates = {};

  // Process each row
  preferences.forEach((pref) => {
    // Grab unique Id for the user
    const userId = pref[currentState.identifierColumn!];

    // determine updates for user
    const pendingUpdates = getPreferenceUpdatesFromRow({
      row: pref,
      columnToPurposeName: currentState.columnToPurposeName,
      preferenceTopics,
      purposeSlugs,
    });

    // Grab current state of the update
    const currentConsentRecord = consentRecordByIdentifier[userId];
    if (forceTriggerWorkflows && !currentConsentRecord) {
      throw new Error(
        `No existing consent record found for user with id: ${userId}.
        When 'forceTriggerWorkflows' is set all the user identifiers should contain a consent record`,
      );
    }
    // Check if the update can be skipped
    // this is the case if a record exists, and the purpose
    // and preference values are all in sync
    if (
      currentConsentRecord &&
      checkIfPendingPreferenceUpdatesAreNoOp({
        currentConsentRecord,
        pendingUpdates,
        preferenceTopics,
      }) &&
      !forceTriggerWorkflows
    ) {
      currentState.skippedUpdates[userId] = pref;
      return;
    }

    // Determine if there are any conflicts
    if (
      currentConsentRecord &&
      checkIfPendingPreferenceUpdatesCauseConflict({
        currentConsentRecord,
        pendingUpdates,
        preferenceTopics,
      })
    ) {
      currentState.pendingConflictUpdates[userId] = {
        row: pref,
        record: currentConsentRecord,
      };
      return;
    }

    // Add to pending updates
    currentState.pendingSafeUpdates[userId] = pref;
  });

  // Read in the file
  fileMetadata[file] = currentState;
  await cache.setValue(fileMetadata, 'fileMetadata');
  const t1 = new Date().getTime();
  logger.info(colors.green(`Successfully pre-processed file: "${file}" in ${(t1 - t0) / 1000}s`));
}

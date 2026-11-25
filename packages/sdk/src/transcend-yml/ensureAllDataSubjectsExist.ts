import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy, flatten, uniq, difference } from 'lodash-es';

import {
  NOOP_LOGGER,
  createDataSubject,
  fetchAllDataSubjects,
  type DataSubject,
} from '../index.js';
import { TranscendInput } from './codecs.js';

/**
 * Fetch all of the data subjects in the organization
 *
 * @param input - Input to fetch
 * @param client - GraphQL client
 * @param fetchAll - When true, always fetch all subjects
 * @param options - Optional logger
 * @returns The list of data subjects
 */
export async function ensureAllDataSubjectsExist(
  input: TranscendInput,
  client: GraphQLClient,
  fetchAll = false,
  {
    logger = NOOP_LOGGER,
    createMissing = 'data-subjects' in input,
  }: {
    /** Logger for progress messages */
    logger?: Logger;
    /** When true, create data subjects that are referenced but missing */
    createMissing?: boolean;
  } = {},
): Promise<{ [type in string]: DataSubject }> {
  const {
    'data-silos': dataSilos = [],
    'data-subjects': dataSubjects = [],
    'processing-activities': processingActivities = [],
    preflights = [],
  } = input;
  const expectedDataSubjects = uniq([
    ...flatten(dataSilos.map((silo) => silo['data-subjects'] || []) || []),
    ...flatten(processingActivities.map(({ dataSubjectTypes }) => dataSubjectTypes ?? []) ?? []),
    ...flatten(preflights.map((preflight) => preflight['data-subjects'] || []) || []),
    ...dataSubjects.map((subject) => subject.type),
  ]);
  if (expectedDataSubjects.length === 0 && !fetchAll) {
    return {};
  }

  const internalSubjects = await fetchAllDataSubjects(client, { logger });
  const dataSubjectByName = keyBy(internalSubjects, 'type');

  const missingDataSubjects = difference(
    expectedDataSubjects,
    internalSubjects.map(({ type }) => type),
  );

  if (missingDataSubjects.length > 0) {
    if (!createMissing) {
      throw new Error(
        `Missing data subject types referenced by this push but not present in the organization: ${missingDataSubjects.join(
          ', ',
        )}. Add a data-subjects section to the input or create them in the dashboard.`,
      );
    }
    logger.info(`Creating ${missingDataSubjects.length} new data subjects...`);
    for (const dataSubjectType of missingDataSubjects) {
      logger.info(`Creating data subject ${dataSubjectType}...`);
      const created = await createDataSubject(client, { input: dataSubjectType, logger });
      logger.info(`Created data subject ${dataSubjectType}!`);
      dataSubjectByName[dataSubjectType] = created;
    }
  }

  return dataSubjectByName;
}

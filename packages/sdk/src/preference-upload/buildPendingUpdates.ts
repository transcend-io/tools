import type { PreferenceUpdateItem } from '@transcend-io/privacy-types';

import type {
  ColumnIdentifierMap,
  ColumnMetadataMap,
  ColumnPurposeMap,
  PendingSafePreferenceUpdates,
  PendingWithConflictPreferenceUpdates,
} from '../preference-management/codecs.js';
import {
  getPreferenceIdentifiersFromRow,
  NONE_PREFERENCE_MAP,
} from '../preference-management/getPreferenceIdentifiersFromRow.js';
import { getPreferenceMetadataFromRow } from '../preference-management/getPreferenceMetadataFromRow.js';
import { getPreferenceUpdatesFromRow } from '../preference-management/getPreferenceUpdatesFromRow.js';
import type { PreferenceTopic } from '../preference-management/fetchAllPreferenceTopics.js';
import type { Purpose } from '../preference-management/fetchAllPurposes.js';

/** Attribute key-value pair for workflow settings */
export interface FormattedAttribute {
  /** Attribute key */
  key: string;
  /** Attribute values */
  values: string[];
}

export interface BuildPendingParams {
  /** Safe updates keyed by user/primaryKey */
  safe: PendingSafePreferenceUpdates;
  /** Conflict updates keyed by user/primaryKey (value.row contains row data) */
  conflicts: PendingWithConflictPreferenceUpdates;
  /** Only upload safe updates (ignore conflicts entirely) */
  skipConflictUpdates: boolean;
  /** Name of the column to use as the preference timestamp (if available) */
  timestampColumn?: string;
  /** CSV column -> purpose/preference mapping */
  columnToPurposeName: ColumnPurposeMap;
  /** CSV column -> identifier mapping */
  columnToIdentifier: ColumnIdentifierMap;
  /** CSV column -> metadata key mapping (optional) */
  columnToMetadata?: ColumnMetadataMap;
  /** Full set of preference topics for resolving row -> preference values */
  preferenceTopics: PreferenceTopic[];
  /** Full set of purposes for resolving slugs/trackingTypes */
  purposes: Purpose[];
  /** Partition to attribute to every record */
  partition: string;
  /** Static attributes injected into workflow settings */
  workflowAttrs: FormattedAttribute[];
  /** If true, downstream should avoid user-visible notifications */
  isSilent: boolean;
  /** If true, skip triggering workflows downstream */
  skipWorkflowTriggers: boolean;
  /** If true, force trigger workflows even if preferences haven't changed */
  forceTriggerWorkflows: boolean;
}

/**
 * Convert parsed CSV rows into a map of PreferenceUpdateItem payloads.
 *
 * This function is pure (no IO, logging or state writes).
 *
 * @param params - Transformation inputs
 * @returns Map of primaryKey -> PreferenceUpdateItem
 */
export function buildPendingUpdates(
  params: BuildPendingParams,
): Record<string, PreferenceUpdateItem> {
  const {
    safe,
    conflicts,
    skipConflictUpdates,
    timestampColumn,
    columnToPurposeName,
    columnToIdentifier,
    columnToMetadata,
    preferenceTopics,
    purposes,
    partition,
    workflowAttrs,
    isSilent,
    skipWorkflowTriggers,
    forceTriggerWorkflows,
  } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: Record<string, any> = skipConflictUpdates
    ? { ...safe }
    : {
        ...safe,
        ...Object.fromEntries(
          Object.entries(conflicts).map(([id, v]) => [id, v.row]),
        ),
      };

  const purposeSlugs = purposes.map((x) => x.trackingType);
  const out: Record<string, PreferenceUpdateItem> = {};

  for (const [userId, row] of Object.entries(merged)) {
    const ts =
      timestampColumn === NONE_PREFERENCE_MAP || !timestampColumn
        ? new Date()
        : new Date(row[timestampColumn]);

    const updates = getPreferenceUpdatesFromRow({
      row,
      columnToPurposeName,
      preferenceTopics,
      purposeSlugs,
    });

    const identifiers = getPreferenceIdentifiersFromRow({
      row,
      columnToIdentifier,
    });

    const metadata = columnToMetadata
      ? getPreferenceMetadataFromRow({ row, columnToMetadata })
      : undefined;

    out[userId] = {
      identifiers,
      partition,
      timestamp: ts.toISOString(),
      purposes: Object.entries(updates).map(([purpose, value]) => ({
        ...value,
        purpose,
        workflowSettings: {
          attributes: workflowAttrs,
          isSilent,
          skipWorkflowTrigger: skipWorkflowTriggers,
          forceTriggerWorkflow: forceTriggerWorkflows,
        },
      })),
      ...(metadata && metadata.length > 0 ? { metadata } : {}),
    };
  }

  return out;
}

import { PersistedState } from '@transcend-io/persisted-state';
import {
  FileFormatState,
  type ColumnIdentifierMap,
  type ColumnMetadataMap,
  type ColumnPurposeMap,
} from '@transcend-io/sdk';
import { retrySamePromise, type RetryPolicy } from '@transcend-io/utils';

export interface PreferenceSchemaInterface {
  /** Name of the column used as timestamp, if any */
  getTimestampColumn(): string | undefined;
  /** CSV column name -> Purpose/Preference mapping */
  getColumnToPurposeName(): ColumnPurposeMap;
  /** CSV column name -> Identifier mapping */
  getColumnToIdentifier(): ColumnIdentifierMap;
  /** CSV column name -> Metadata key mapping */
  getColumnToMetadata(): ColumnMetadataMap | undefined;
  /** CSV columns to ignore during upload */
  getColumnsToIgnore(): string[];
  /** The underlying persisted schema file */
  state: PersistedState<typeof FileFormatState>;
}

/**
 * Build a schema state adapter holding CSV→purpose/identifier mappings.
 *
 * Retries creation of the underlying PersistedState with **exponential backoff**
 * when the schema file cannot be parsed due to a transient write (e.g., empty or
 * partially written file) indicated by "Unexpected end of JSON input".
 *
 * @param filepath - Path to the schema file
 * @returns Schema state port with strongly-named methods
 */
export async function makeSchemaState(filepath: string): Promise<PreferenceSchemaInterface> {
  const initial = {
    columnToPurposeName: {},
    lastFetchedAt: new Date().toISOString(),
    columnToIdentifier: {},
  } as const;

  const policy: RetryPolicy = {
    maxAttempts: 5,
    delayMs: 50,
    shouldRetry: (_status, message) =>
      typeof message === 'string' && /Unexpected end of JSON input/i.test(message ?? ''),
  };
  const MAX_DELAY_MS = 2_000;

  try {
    const state = await retrySamePromise(
      async () => new PersistedState(filepath, FileFormatState, initial),
      policy,
      () => {
        policy.delayMs = Math.min(MAX_DELAY_MS, Math.max(1, policy.delayMs * 2));
      },
    );

    return {
      state,
      getTimestampColumn: (): string | undefined => state.getValue('timestampColumn'),
      getColumnToPurposeName: (): ColumnPurposeMap => state.getValue('columnToPurposeName'),
      getColumnToIdentifier: (): ColumnIdentifierMap => state.getValue('columnToIdentifier'),
      getColumnToMetadata: (): ColumnMetadataMap | undefined => state.getValue('columnToMetadata'),
      getColumnsToIgnore: (): string[] => state.getValue('columnsToIgnore') ?? [],
    };
  } catch (err) {
    throw new Error(
      `Failed to create schema state from ${filepath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

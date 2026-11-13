import { PersistedState } from '@transcend-io/persisted-state';
import {
  RequestUploadReceipts,
  type FailingPreferenceUpdates,
  type PendingSafePreferenceUpdates,
  type PendingWithConflictPreferenceUpdates,
  type PreferenceUpdateMap,
  type SkippedPreferenceUpdates,
} from '@transcend-io/sdk';
import { retrySamePromise, type RetryPolicy } from '@transcend-io/utils';

export interface PreferenceReceiptsInterface {
  /** Path to the receipts file */
  receiptsFilepath: string;
  /** Get the successfully updated records */
  getSuccessful(): PreferenceUpdateMap;
  /** Get the records pending upload */
  getPending(): PreferenceUpdateMap;
  /** Get the records that failed to upload */
  getFailing(): FailingPreferenceUpdates;
  /** Set the new map of successful records */
  setSuccessful(next: PreferenceUpdateMap): Promise<void>;
  /** Set the new map of pending records */
  setPending(next: PreferenceUpdateMap): Promise<void>;
  /** Set the new map of safe to upload records */
  setPendingSafe(next: PendingSafePreferenceUpdates): Promise<void>;
  /** Set the skipped records */
  setSkipped(next: SkippedPreferenceUpdates): Promise<void>;
  /** Set the new map of conflicting records */
  setPendingConflict(next: PendingWithConflictPreferenceUpdates): Promise<void>;
  /** Set the new map of failing records */
  setFailing(next: FailingPreferenceUpdates): Promise<void>;
  /** Clear pending, pending safe, skipped, and pending conflict records */
  resetPending(): Promise<void>;
}

/**
 * Build a receipts state adapter for the given file path.
 *
 * Retries creation of the underlying PersistedState with **exponential backoff**
 * when the receipts file cannot be parsed due to a transient write (e.g., empty
 * or partially written file) indicated by "Unexpected end of JSON input".
 *
 * @param filepath - Where to persist/read upload receipts
 * @returns Receipt state port with strongly-named methods
 */
export async function makeReceiptsState(filepath: string): Promise<PreferenceReceiptsInterface> {
  const initial = {
    failingUpdates: {},
    pendingConflictUpdates: {},
    skippedUpdates: {},
    pendingSafeUpdates: {},
    successfulUpdates: {},
    pendingUpdates: {},
    lastFetchedAt: new Date().toISOString(),
  } as const;

  const policy: RetryPolicy = {
    maxAttempts: 10,
    delayMs: 500,
    shouldRetry: (_status, message) =>
      typeof message === 'string' && /Unexpected end of JSON input/i.test(message ?? ''),
  };
  const MAX_DELAY_MS = 5_000;

  try {
    const s = await retrySamePromise(
      async () => new PersistedState(filepath, RequestUploadReceipts, initial),
      policy,
      () => {
        policy.delayMs = Math.min(MAX_DELAY_MS, Math.max(1, policy.delayMs * 2));
      },
    );

    return {
      receiptsFilepath: filepath,
      getSuccessful: () => s.getValue('successfulUpdates'),
      getPending: () => s.getValue('pendingUpdates'),
      getFailing: () => s.getValue('failingUpdates'),
      async setSuccessful(v: PreferenceUpdateMap) {
        await s.setValue(v, 'successfulUpdates');
      },
      async setSkipped(v: SkippedPreferenceUpdates) {
        await s.setValue(v, 'skippedUpdates');
      },
      async setPending(v: PreferenceUpdateMap) {
        await s.setValue(v, 'pendingUpdates');
      },
      async setPendingSafe(v: PendingSafePreferenceUpdates) {
        await s.setValue(v, 'pendingSafeUpdates');
      },
      async setPendingConflict(v: PendingWithConflictPreferenceUpdates) {
        await s.setValue(v, 'pendingConflictUpdates');
      },
      async setFailing(v: FailingPreferenceUpdates) {
        await s.setValue(v, 'failingUpdates');
      },
      async resetPending() {
        await s.setValue({}, 'pendingUpdates');
        await s.setValue({}, 'pendingSafeUpdates');
        await s.setValue({}, 'skippedUpdates');
        await s.setValue({}, 'pendingConflictUpdates');
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to create receipts state for ${filepath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

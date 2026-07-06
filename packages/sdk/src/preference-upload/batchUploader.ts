import type { PreferenceUpdateItem } from '@transcend-io/privacy-types';
import {
  extractErrorMessage,
  getErrorStatus,
  retrySamePromise,
  splitInHalf,
  type Logger,
  type RetryPolicy,
} from '@transcend-io/utils';

type Entry = [string, PreferenceUpdateItem];

export interface BatchUploadPreferenceOptions {
  /** When true - don't trigger workflow runs */
  skipWorkflowTriggers: boolean;
}

export interface BatchUploaderDeps {
  /** Network transport used for PUT uploads */
  putBatch: (updates: PreferenceUpdateItem[], opts: BatchUploadPreferenceOptions) => Promise<void>;
  /** Retry policy for retryable statuses */
  retryPolicy: RetryPolicy;
  /** Endpoint behavior flags */
  options: BatchUploadPreferenceOptions;
  /** Decide if a status is retryable *in place* (no splitting) */
  isRetryableStatus: (status?: number) => boolean;
  /** Logger */
  logger: Logger;
}

/**
 * Upload a batch of entries with retry + split fallback.
 *
 * Orchestrates the per-chunk upload flow with:
 * 1) Whole-batch attempt
 * 2) In-place retries for retryable statuses
 * 3) Recursive splitting for non-retryable errors (down to singletons)
 *
 * @param entries - Array of [primaryKey, update] pairs
 * @param deps - Injected transport + policy + logger
 * @param callbacks - Callback functions
 */
export async function uploadChunkWithSplit(
  entries: Entry[],
  deps: BatchUploaderDeps,
  callbacks: {
    /** Callback invoked after a successful upload of `entries` */
    onSuccess: (entries: Entry[]) => Promise<void>;
    /** Callback for single-entry failure terminal case */
    onFailureSingle: (entry: Entry, err: unknown) => Promise<void>;
    /** Callback for terminal failure of the entire batch */
    onFailureBatch: (entries: Entry[], err: unknown) => Promise<void>;
  },
): Promise<void> {
  const { logger } = deps;

  const putAll = (): Promise<void> =>
    deps.putBatch(
      entries.map(([, u]) => u),
      deps.options,
    );

  try {
    await putAll();
    await callbacks.onSuccess(entries);
  } catch (errRaw) {
    let err = errRaw;
    const status = getErrorStatus(err);
    const msg = extractErrorMessage(err);

    const isSoftRateLimit =
      status === 400 &&
      /slow down|please try again shortly|Throughput exceeds the current/i.test(msg);

    if (deps.isRetryableStatus(status) || isSoftRateLimit) {
      try {
        await retrySamePromise(putAll, deps.retryPolicy, (note) => logger.warn(note));
        await callbacks.onSuccess(entries);
        return;
      } catch (err2) {
        if (deps.isRetryableStatus(getErrorStatus(err2))) {
          logger.error(
            `Exhausted retries for batch of ${entries.length}. Marking entire batch as failed.`,
          );
          await callbacks.onFailureBatch(entries, err2);
          return;
        }
        err = err2;
      }
    }

    if (entries.length === 1) {
      try {
        await putAll();
        await callbacks.onSuccess(entries);
      } catch (singleErr) {
        await callbacks.onFailureSingle(entries[0]!, singleErr);
      }
      return;
    }

    const [left, right] = splitInHalf(entries);
    logger.warn(
      `Non-retryable failure for batch of ${entries.length} (status=${status}): ${msg}. ` +
        `Splitting into ${left.length} and ${right.length}.`,
    );

    await uploadChunkWithSplit(left, deps, callbacks);
    await uploadChunkWithSplit(right, deps, callbacks);
  }
}

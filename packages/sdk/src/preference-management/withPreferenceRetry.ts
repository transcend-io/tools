import {
  RETRY_TRANSIENT_MSGS,
  withTransientRetry,
  type RetryOptions,
} from '../api/withTransientRetry.js';

/**
 * @deprecated Use `RETRY_TRANSIENT_MSGS` from `../api/withTransientRetry.js` instead.
 * Preserved as a re-export so downstream consumers of `@transcend-io/sdk` that
 * imported the preference-scoped name continue to work.
 */
export const RETRY_PREFERENCE_MSGS = RETRY_TRANSIENT_MSGS;

/**
 * @deprecated Use `RetryOptions` from `../api/withTransientRetry.js` instead.
 */
export type { RetryOptions };

/**
 * @deprecated Use `withTransientRetry` from `../api/withTransientRetry.js` instead.
 * Preserved as a re-export for backwards compatibility.
 *
 * @param name - Short name of the operation
 * @param fn - Function to run under the retry wrapper
 * @param options - Retry options
 * @returns Result of the wrapped function on its first successful attempt
 */
export async function withPreferenceRetry<T>(
  name: string,
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  return withTransientRetry(name, fn, options);
}

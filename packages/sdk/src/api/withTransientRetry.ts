import { extractErrorMessage, sleepPromise, type Logger } from '@transcend-io/utils';

import { NOOP_LOGGER } from './makeGraphQLRequest.js';

/**
 * Transient network / platform errors that merit a retry.
 *
 * We keep this list short and specific to avoid masking real failures (e.g.
 * bad payloads, auth errors, or validation errors). Matches the behaviour that
 * was previously scoped to preference-management operations.
 */
export const RETRY_TRANSIENT_MSGS: string[] = [
  'ENOTFOUND',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  // Gateway / upstream 5xx surfaced in messages; we match the bare reason
  // phrase rather than `502 Bad Gateway` because `got`'s default message
  // shape is `Response code 502 (Bad Gateway)` (parenthesised) so a strict
  // substring against the numeric form would miss real failures.
  'bad gateway',
  'service unavailable',
  'gateway time-out',
  'gateway timeout',
  '429',
  'rate limit exceeded',
  'too many requests',
  'task timed out after',
  'unknown request error',
  'socket hang up',
].map((s) => s.toLowerCase());

/**
 * Transient HTTP status codes that merit a retry. Covers rate limiting and
 * the typical gateway / upstream classes of 5xx errors surfaced by our
 * reverse tunnel and load balancers.
 */
const RETRY_TRANSIENT_STATUS_CODES: readonly number[] = [408, 425, 429, 500, 502, 503, 504];

/**
 * Options for running an operation with transient-error retries.
 */
export type RetryOptions = {
  /** Logger used to emit retry breadcrumbs */
  logger?: Logger;
  /** Max attempts including the first try (default 12) */
  maxAttempts?: number;
  /** Initial backoff in ms; doubled on each attempt with added jitter (default 250) */
  baseDelayMs?: number;
  /** Optional custom predicate to decide if an error is retryable */
  isRetryable?: (err: unknown, message: string) => boolean;
  /** Optional hook called once per retry attempt (before the sleep) */
  onRetry?: (attempt: number, err: unknown, message: string) => void;
};

/**
 * Default retry predicate. Matches either a known transient error message
 * substring or a known transient HTTP status code on `got`-style errors.
 *
 * @param err - Thrown error
 * @param message - Extracted human-readable message
 * @returns True if the error should be retried
 */
export function isTransientError(err: unknown, message: string): boolean {
  const lower = message.toLowerCase();
  if (RETRY_TRANSIENT_MSGS.some((m) => lower.includes(m))) {
    return true;
  }

  // `got` HTTPError puts the status code on `err.response.statusCode`; other
  // clients use `err.status` or `err.statusCode`.
  const maybe = err as {
    /** `got` HTTPError shape */
    response?: {
      /** HTTP status code returned by the server */
      statusCode?: number;
    };
    /** Axios / fetch-style shape */
    status?: number;
    /** Node http error shape */
    statusCode?: number;
  };
  const statusCode = maybe?.response?.statusCode ?? maybe?.status ?? maybe?.statusCode;
  return typeof statusCode === 'number' && RETRY_TRANSIENT_STATUS_CODES.includes(statusCode);
}

/**
 * Run an async function with standardized retry behaviour for transient
 * network / gateway errors (502/503/504/429, ECONNRESET, ETIMEDOUT, etc.).
 *
 * Applies exponential backoff with jitter, and only retries on known-transient
 * errors to avoid masking real client-side failures.
 *
 * @param name - Short name of the operation, used in logs and the final error message
 * @param fn - Function to run; called once per attempt
 * @param options - Retry options
 * @returns Result of the function on the first successful attempt
 */
export async function withTransientRetry<T>(
  name: string,
  fn: () => Promise<T>,
  {
    logger = NOOP_LOGGER,
    maxAttempts = 12,
    baseDelayMs = 250,
    isRetryable = isTransientError,
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg: string = extractErrorMessage(err);
      const willRetry = attempt < maxAttempts && isRetryable(err, msg);
      if (!willRetry) {
        throw new Error(`${name} failed after ${attempt} attempt(s): ${msg}`);
      }
      onRetry?.(attempt, err, msg);

      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * baseDelayMs);
      const delay = backoff + jitter;
      logger.warn(`[retry] attempt ${attempt}/${maxAttempts - 1}; backing off ${delay}ms: ${msg}`);
      await sleepPromise(delay);
    }
  }
}

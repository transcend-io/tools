import { DsrErrorCode } from './dsrErrorCode.js';

/**
 * Maximum CPPA DROP records that can be linked to a single DSR at submission
 * time.
 */
export const MAX_DROP_RECORDS_PER_REQUEST = 500;

/**
 * Maximum number of requests that can be submitted at once in a bulk
 * operation.
 */
export const REQUEST_SUBMISSION_LIMIT = 100;

/**
 * Human-readable error when a DROP retry would link records to an existing
 * request without every submitted identifier already present on that request.
 */
export const DROP_IDENTIFIER_COVERAGE_MISMATCH_MESSAGE =
  'Cannot link DROP records to an existing request until every identifier on this submission is already on that request. Submit a new request that includes all required identifiers, or retry with only identifiers already on the existing request.';

/**
 * Error when the same (dropRecordId, dropListType) DROP record is claimed more
 * than once within one submission.
 */
export const DUPLICATE_DROP_RECORDS_MESSAGE =
  'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.';

/**
 * Error when a bulk batch collapses multiple DROP rows that share a
 * `(dropRunId, idempotencyKey)` but carry incompatible identifier values.
 */
export const IN_BATCH_DROP_IDEMPOTENCY_KEY_COLLISION_MESSAGE =
  'In-batch DROP rows that share a dropRunId idempotency key must carry the same identifier values.';

/** Error when `dropRecords` is present without a `dropRunId`. */
export const DROP_RECORDS_REQUIRE_DROP_RUN_ID_MESSAGE = 'dropRecords requires dropRunId';

/** Error when a duplicate open request already exists for this data subject. */
export const DUPLICATE_REQUEST_MESSAGE = 'You have already made this request.';

/** Error when a broader open parent request already covers this submission. */
export const OPEN_PARENT_REQUEST_EXISTS_MESSAGE = 'An open parent request already exists';

/** Error when the batch is missing the required Diffie-Hellman encrypted payload. */
export const DH_CONTEXT_REQUIRED_MESSAGE = 'No encrypted data subject payload provided';

/**
 * Error when a concurrent DROP bulk submission wins the unique-index race and
 * creates one or more of the same requests first.
 */
export const CONCURRENT_DROP_SUBMISSION_MESSAGE =
  'A concurrent DROP submission already created one or more of these requests. Retry the batch.';

/** Error when the per-request DROP record limit is exceeded. */
export function maxDropRecordsPerRequestExceededMessage(): string {
  return `Cannot link more than ${MAX_DROP_RECORDS_PER_REQUEST} DROP records to a single request.`;
}

/** Error when the bulk submission request count limit is exceeded. */
export function requestSubmissionThresholdExceededMessage(): string {
  return `Cannot submit more than ${REQUEST_SUBMISSION_LIMIT} requests at once. Please split your requests into smaller batches and try again.`;
}

/**
 * Error when one or more restart targets do not exist.
 *
 * @param requestIds - Request IDs that could not be found
 */
export function restartRequestsNotFoundMessage(requestIds: string[]): string {
  return `Cannot restart: request(s) not found for ID(s): ${requestIds.join(', ')}`;
}

/** Inputs for {@link restartTimeLimitExceededMessage}. */
export interface RestartTimeLimitExceededMessageInput {
  /** Days since the request's status last changed */
  daysSinceLastTransition: number;
  /** Organization-configured restart time limit in days */
  restartTimeLimitDays: number;
}

/** Error when a restart exceeds the organization's configured time limit. */
export function restartTimeLimitExceededMessage({
  daysSinceLastTransition,
  restartTimeLimitDays,
}: RestartTimeLimitExceededMessageInput): string {
  return `This request's status last changed ${daysSinceLastTransition} days ago, which exceeds your organization's restart time limit of ${restartTimeLimitDays} days. Create a new request instead.`;
}

/**
 * Error when a submission references a DROP run that does not exist.
 *
 * @param dropRunId - The missing DROP run ID
 */
export function dropRunNotFoundMessage(dropRunId: string): string {
  return `Could not find DROP run with id "${dropRunId}"`;
}

/**
 * Static user-facing messages keyed by {@link DsrErrorCode}.
 *
 * Codes omitted from this map:
 * - `INVALID_INPUT` — one code maps to many distinct messages; use the
 *   standalone constants and builder functions exported from this module.
 * - `MIXED_CEK_CONTEXT` — the GraphQL bulk resolver and internal submit
 *   helper use different strings today.
 * - `RESTART_REQUEST_NOT_FOUND`, `RESTART_TIME_LIMIT_EXCEEDED`,
 *   `DROP_RUN_NOT_FOUND` — parameterized; use
 *   {@link restartRequestsNotFoundMessage}, {@link restartTimeLimitExceededMessage},
 *   and {@link dropRunNotFoundMessage}.
 *
 * `SUBMISSION_LIMIT_EXCEEDED` is included even though
 * {@link requestSubmissionThresholdExceededMessage} exists, because the text
 * is fully determined by {@link REQUEST_SUBMISSION_LIMIT}.
 *
 * The unknown-DROP-records error in `linkDropRunRequests.ts` is intentionally
 * not centralized here; its truncation and list formatting stay in `main`.
 */
export const DSR_ERROR_MESSAGE: Partial<Record<DsrErrorCode, string>> = {
  [DsrErrorCode.DuplicateRequest]: DUPLICATE_REQUEST_MESSAGE,
  [DsrErrorCode.OpenParentRequestExists]: OPEN_PARENT_REQUEST_EXISTS_MESSAGE,
  [DsrErrorCode.SubmissionLimitExceeded]: requestSubmissionThresholdExceededMessage(),
  [DsrErrorCode.DhContextRequired]: DH_CONTEXT_REQUIRED_MESSAGE,
  [DsrErrorCode.DropIdentifierCoverageMismatch]: DROP_IDENTIFIER_COVERAGE_MISMATCH_MESSAGE,
  [DsrErrorCode.ConcurrentSubmissionConflict]: CONCURRENT_DROP_SUBMISSION_MESSAGE,
};

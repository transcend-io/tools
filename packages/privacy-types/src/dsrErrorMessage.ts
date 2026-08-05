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

/** Inputs for the {@link DsrErrorCode.RestartTimeLimitExceeded} message builder. */
export interface RestartTimeLimitExceededMessageInput {
  /** Days since the request's status last changed */
  daysSinceLastTransition: number;
  /** Organization-configured restart time limit in days */
  restartTimeLimitDays: number;
}

/** {@link DsrErrorCode} values with a builder in {@link DSR_ERROR_MESSAGE}. */
export type DsrErrorCodeWithMessage = Exclude<DsrErrorCode, typeof DsrErrorCode.InvalidInput>;

/** Message builders keyed by {@link DsrErrorCode} (except {@link DsrErrorCode.InvalidInput}). */
type DsrErrorMessageByCode = {
  [DsrErrorCode.DuplicateRequest]: () => string;
  [DsrErrorCode.OpenParentRequestExists]: () => string;
  [DsrErrorCode.RestartRequestNotFound]: (requestIds: readonly string[]) => string;
  [DsrErrorCode.RestartTimeLimitExceeded]: (input: RestartTimeLimitExceededMessageInput) => string;
  [DsrErrorCode.SubmissionLimitExceeded]: () => string;
  [DsrErrorCode.MixedCekContext]: () => string;
  [DsrErrorCode.DhContextRequired]: () => string;
  [DsrErrorCode.DropIdentifierCoverageMismatch]: () => string;
  [DsrErrorCode.ConcurrentSubmissionConflict]: () => string;
  [DsrErrorCode.DropRunNotFound]: (dropRunId: string) => string;
};

type _AssertAllCodesHaveBuilders = DsrErrorCodeWithMessage extends keyof DsrErrorMessageByCode
  ? keyof DsrErrorMessageByCode extends DsrErrorCodeWithMessage
    ? true
    : never
  : never;
const _assertAllCodesHaveBuilders: _AssertAllCodesHaveBuilders = true;

/** {@link DsrErrorCode.InvalidInput} validation messages with distinct text per failure. */
type DsrInvalidInputMessageMap = {
  duplicateDropRecords: () => string;
  inBatchDropIdempotencyKeyCollision: () => string;
  dropRecordsRequireDropRunId: () => string;
  maxDropRecordsPerRequestExceeded: () => string;
};

/** Canonical DSR bulk submission error message builders. */
export type DsrErrorMessageMap = DsrErrorMessageByCode & {
  invalidInput: DsrInvalidInputMessageMap;
};

/**
 * Canonical DSR bulk submission error messages.
 *
 * Entries keyed by {@link DsrErrorCode} are message builders; call them to render
 * the runtime string (static messages use zero-arg functions). DSR submission
 * errors currently surface as HTTP 400 bad-request validation failures, so no
 * separate status map is exported.
 *
 * `INVALID_INPUT` is omitted from the code-keyed section because many distinct
 * validation failures share that code; use {@link DSR_ERROR_MESSAGE.invalidInput}
 * for those strings.
 *
 * The unknown-DROP-records error in `linkDropRunRequests.ts` is intentionally
 * not centralized here; its truncation and list formatting stay in `main`.
 */
export const DSR_ERROR_MESSAGE = {
  [DsrErrorCode.DuplicateRequest]: () => 'You have already made this request.',
  [DsrErrorCode.OpenParentRequestExists]: () => 'An open parent request already exists',
  [DsrErrorCode.RestartRequestNotFound]: (requestIds: readonly string[]) =>
    `Cannot restart: request(s) not found for ID(s): ${requestIds.join(', ')}`,
  [DsrErrorCode.RestartTimeLimitExceeded]: ({
    daysSinceLastTransition,
    restartTimeLimitDays,
  }: RestartTimeLimitExceededMessageInput) =>
    `This request's status last changed ${daysSinceLastTransition} days ago, which exceeds your organization's restart time limit of ${restartTimeLimitDays} days. Create a new request instead.`,
  [DsrErrorCode.SubmissionLimitExceeded]: () =>
    `Cannot submit more than ${REQUEST_SUBMISSION_LIMIT} requests at once. Please split your requests into smaller batches and try again.`,
  [DsrErrorCode.MixedCekContext]: () =>
    'Either all or none of the requests must include encryptedCEKContext',
  [DsrErrorCode.DhContextRequired]: () => 'No encrypted data subject payload provided',
  [DsrErrorCode.DropIdentifierCoverageMismatch]: () =>
    'Cannot link DROP records to an existing request until every identifier on this submission is already on that request. Submit a new request that includes all required identifiers, or retry with only identifiers already on the existing request.',
  [DsrErrorCode.ConcurrentSubmissionConflict]: () =>
    'A concurrent DROP submission already created one or more of these requests. Retry the batch.',
  [DsrErrorCode.DropRunNotFound]: (dropRunId: string) =>
    `Could not find DROP run with id "${dropRunId}"`,
  invalidInput: {
    duplicateDropRecords: () =>
      'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.',
    inBatchDropIdempotencyKeyCollision: () =>
      'In-batch DROP rows that share a dropRunId idempotency key must carry the same identifier values.',
    dropRecordsRequireDropRunId: () => 'dropRecords requires dropRunId',
    maxDropRecordsPerRequestExceeded: () =>
      `Cannot link more than ${MAX_DROP_RECORDS_PER_REQUEST} DROP records to a single request.`,
  },
} as const satisfies DsrErrorMessageMap;

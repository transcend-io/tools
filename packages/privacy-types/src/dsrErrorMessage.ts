import { DropListType } from './drop.js';
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
 * Maximum unknown DROP records named in an {@link DsrErrorCode.UnknownDropRecords}
 * error message before truncating with an "and N more" suffix.
 */
export const MAX_UNKNOWN_RECORDS_IN_ERROR = 20;

/** Inputs for the {@link DsrErrorCode.RestartTimeLimitExceeded} message builder. */
export interface RestartTimeLimitExceededMessageInput {
  /** Days since the request's status last changed */
  daysSinceLastTransition: number;
  /** Organization-configured restart time limit in days */
  restartTimeLimitDays: number;
}

/** Inputs for the {@link DsrErrorCode.UnknownDropRecords} message builder. */
export interface UnknownDropRecordsMessageInput {
  dropRecordId: string;
  dropListType: DropListType;
}

/** Canonical message builder for each {@link DsrErrorCode}. */
export type DsrErrorMessageMap = {
  [DsrErrorCode.NoInputsProvided]: () => string;
  [DsrErrorCode.InvalidWorkflowConfigId]: () => string;
  [DsrErrorCode.MissingCoreIdentifier]: () => string;
  [DsrErrorCode.RestartRequestNotFound]: (requestIds: readonly string[]) => string;
  [DsrErrorCode.RestartTimeLimitExceeded]: (input: RestartTimeLimitExceededMessageInput) => string;
  [DsrErrorCode.SubmissionLimitExceeded]: () => string;
  [DsrErrorCode.MixedCekContext]: () => string;
  [DsrErrorCode.DhContextRequired]: () => string;
  [DsrErrorCode.ReceiptTemplateNotFound]: (templateId: string) => string;
  [DsrErrorCode.DropIdentifierCoverageMismatch]: () => string;
  [DsrErrorCode.DuplicateDropRecords]: () => string;
  [DsrErrorCode.InBatchDropIdempotencyKeyCollision]: () => string;
  [DsrErrorCode.DropRecordsRequireDropRunId]: () => string;
  [DsrErrorCode.MaxDropRecordsPerRequestExceeded]: () => string;
  [DsrErrorCode.UnknownDropRecords]: (records: readonly UnknownDropRecordsMessageInput[]) => string;
  [DsrErrorCode.ConcurrentSubmissionConflict]: () => string;
  [DsrErrorCode.DropRunNotFound]: (dropRunId: string) => string;
};

type _AssertAllCodesHaveBuilders = DsrErrorCode extends keyof DsrErrorMessageMap
  ? keyof DsrErrorMessageMap extends DsrErrorCode
    ? true
    : never
  : never;
const _assertAllCodesHaveBuilders: _AssertAllCodesHaveBuilders = true;

/**
 * Canonical DSR bulk submission error messages.
 *
 * Each {@link DsrErrorCode} has exactly one builder; call
 * `DSR_ERROR_MESSAGE[code](...)` to render the runtime string. DSR submission
 * errors currently surface as HTTP 400 bad-request validation failures, so no
 * separate status map is exported.
 */
export const DSR_ERROR_MESSAGE = {
  [DsrErrorCode.NoInputsProvided]: () => 'No inputs provided',
  [DsrErrorCode.InvalidWorkflowConfigId]: () => 'All requests must have a valid workflowConfigId',
  [DsrErrorCode.MissingCoreIdentifier]: () => 'Missing core identifier',
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
  [DsrErrorCode.ReceiptTemplateNotFound]: (templateId: string) =>
    `Could not find specified email template ID: ${templateId}`,
  [DsrErrorCode.DropIdentifierCoverageMismatch]: () =>
    'Cannot link DROP records to an existing request until every identifier on this submission is already on that request. Submit a new request that includes all required identifiers, or retry with only identifiers already on the existing request.',
  [DsrErrorCode.DuplicateDropRecords]: () =>
    'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.',
  [DsrErrorCode.InBatchDropIdempotencyKeyCollision]: () =>
    'In-batch DROP rows that share a dropRunId idempotency key must carry the same identifier values.',
  [DsrErrorCode.DropRecordsRequireDropRunId]: () => 'dropRecords requires dropRunId',
  [DsrErrorCode.MaxDropRecordsPerRequestExceeded]: () =>
    `Cannot link more than ${MAX_DROP_RECORDS_PER_REQUEST} DROP records to a single request.`,
  [DsrErrorCode.UnknownDropRecords]: (records: readonly UnknownDropRecordsMessageInput[]) => {
    const named = records
      .slice(0, MAX_UNKNOWN_RECORDS_IN_ERROR)
      .map(({ dropRecordId, dropListType }) => `${dropRecordId} (${dropListType})`)
      .join(', ');
    const remainder =
      records.length > MAX_UNKNOWN_RECORDS_IN_ERROR
        ? ` and ${records.length - MAX_UNKNOWN_RECORDS_IN_ERROR} more`
        : '';
    return (
      `${records.length} DROP record(s) are not part of this run's CPPA ` +
      `download: ${named}${remainder}. Re-index the run's records, or ` +
      'download a fresh matched-records file and edit that.'
    );
  },
  [DsrErrorCode.ConcurrentSubmissionConflict]: () =>
    'A concurrent DROP submission already created one or more of these requests. Retry the batch.',
  [DsrErrorCode.DropRunNotFound]: (dropRunId: string) =>
    `Could not find DROP run with id "${dropRunId}"`,
} as const satisfies DsrErrorMessageMap;

import { DsrBulkErrorCode } from './dsrBulkErrorCode.js';
import { REQUEST_SUBMISSION_LIMIT } from './dsrErrorMessage.js';

/** Canonical message builder for each {@link DsrBulkErrorCode}. */
export type DsrBulkErrorMessageMap = {
  [DsrBulkErrorCode.NoInputsProvided]: () => string;
  [DsrBulkErrorCode.SubmissionLimitExceeded]: () => string;
  [DsrBulkErrorCode.MixedCekContext]: () => string;
  [DsrBulkErrorCode.DhContextRequired]: () => string;
  [DsrBulkErrorCode.ConcurrentSubmissionConflict]: () => string;
};

type _AssertAllBulkCodesHaveBuilders = DsrBulkErrorCode extends keyof DsrBulkErrorMessageMap
  ? keyof DsrBulkErrorMessageMap extends DsrBulkErrorCode
    ? true
    : never
  : never;
const _assertAllBulkCodesHaveBuilders: _AssertAllBulkCodesHaveBuilders = true;

/**
 * Canonical bulk-call DSR submission error messages.
 *
 * Each {@link DsrBulkErrorCode} has exactly one builder for failures that apply
 * to the submission as a whole. These currently surface as HTTP 400 bad-request
 * validation failures, so no separate status map is exported.
 */
export const DSR_BULK_ERROR_MESSAGE = {
  [DsrBulkErrorCode.NoInputsProvided]: () => 'No inputs provided',
  [DsrBulkErrorCode.SubmissionLimitExceeded]: () =>
    `Cannot submit more than ${REQUEST_SUBMISSION_LIMIT} requests at once. Please split your requests into smaller batches and try again.`,
  [DsrBulkErrorCode.MixedCekContext]: () =>
    'Either all or none of the requests must include encryptedCEKContext',
  [DsrBulkErrorCode.DhContextRequired]: () => 'No encrypted data subject payload provided',
  [DsrBulkErrorCode.ConcurrentSubmissionConflict]: () =>
    'A concurrent DROP submission already created one or more of these requests. Retry the batch.',
} as const satisfies DsrBulkErrorMessageMap;

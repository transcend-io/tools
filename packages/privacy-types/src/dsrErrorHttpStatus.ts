import { DsrErrorCode } from './dsrErrorCode.js';

/**
 * Maps each {@link DsrErrorCode} to the HTTP status returned by DSR bulk
 * submission endpoints.
 *
 * Every code currently maps to 400 because these failures are surfaced as
 * bad-request validation errors on the submission payload or its preconditions,
 * even when the underlying condition is semantically a conflict or missing
 * resource.
 */
export const DSR_ERROR_HTTP_STATUS: Record<DsrErrorCode, number> = {
  /** An identical open request already exists for this data subject. */
  [DsrErrorCode.DuplicateRequest]: 400,
  /** A broader open parent request already covers this submission. */
  [DsrErrorCode.OpenParentRequestExists]: 400,
  /** A restart targeted a request ID that does not exist. */
  [DsrErrorCode.RestartRequestNotFound]: 400,
  /** A restart exceeded the organization's configured time limit. */
  [DsrErrorCode.RestartTimeLimitExceeded]: 400,
  /** The bulk batch exceeds the per-request item limit. */
  [DsrErrorCode.SubmissionLimitExceeded]: 400,
  /** The batch mixed items with and without a pre-generated CEK context. */
  [DsrErrorCode.MixedCekContext]: 400,
  /** The batch is missing the required Diffie-Hellman encrypted payload. */
  [DsrErrorCode.DhContextRequired]: 400,
  /** Generic input validation failure. */
  [DsrErrorCode.InvalidInput]: 400,
  /** DROP linkage identifiers do not cover the required identifier types. */
  [DsrErrorCode.DropIdentifierCoverageMismatch]: 400,
  /** A concurrent bulk submission already created one or more of these requests. */
  [DsrErrorCode.ConcurrentSubmissionConflict]: 400,
  /** The referenced DROP run does not exist. */
  [DsrErrorCode.DropRunNotFound]: 400,
};

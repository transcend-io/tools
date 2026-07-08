import { makeEnum } from '@transcend-io/type-utils';

/**
 * Stable, machine-readable error codes for the DSR submission API
 * (`POST /v1/data-subject-request` and `POST /v1/data-subject-request-bulk`).
 *
 * Surfaced to clients as `extensions.code` on GraphQL errors so they can branch
 * on the failure type without parsing the error message, and mapped to a
 * distinct HTTP status code by Sombra's bulk ingress handler (and by the
 * backend REST bridge for the single endpoint via the thrown error's numeric
 * `code`).
 */
export const DsrErrorCode = makeEnum({
  /** A duplicate open request already exists for this data subject + type. */
  DuplicateRequest: 'DUPLICATE_REQUEST',
  /** An open parent request already exists for this data subject. */
  OpenParentRequestExists: 'OPEN_PARENT_REQUEST_EXISTS',
  /** A restart was requested for a request ID that does not exist. */
  RestartRequestNotFound: 'RESTART_REQUEST_NOT_FOUND',
  /** A restart was requested for a request closed beyond the org's time limit. */
  RestartTimeLimitExceeded: 'RESTART_TIME_LIMIT_EXCEEDED',
  /** The bulk submission exceeds the per-request item limit. */
  SubmissionLimitExceeded: 'SUBMISSION_LIMIT_EXCEEDED',
  /** A bulk submission mixed items with and without a pre-generated CEK context. */
  MixedCekContext: 'MIXED_CEK_CONTEXT',
  /** The required Diffie-Hellman encrypted payload was missing. */
  DhContextRequired: 'DH_CONTEXT_REQUIRED',
  /** Generic input validation failure. */
  InvalidInput: 'INVALID_INPUT',
});

/** Type override */
export type DsrErrorCode = (typeof DsrErrorCode)[keyof typeof DsrErrorCode];

/**
 * Maps each {@link DsrErrorCode} to the HTTP status code Sombra's bulk ingress
 * returns for that failure. The single REST endpoint derives its status from
 * the thrown `TranscendError.code` directly; this map is the source of truth
 * that the backend throw helper and Sombra bulk handler both consult so the two
 * endpoints stay consistent.
 */
export const DSR_ERROR_HTTP_STATUS: Record<DsrErrorCode, number> = {
  [DsrErrorCode.DuplicateRequest]: 409,
  [DsrErrorCode.OpenParentRequestExists]: 409,
  [DsrErrorCode.RestartRequestNotFound]: 404,
  [DsrErrorCode.RestartTimeLimitExceeded]: 409,
  [DsrErrorCode.SubmissionLimitExceeded]: 400,
  [DsrErrorCode.MixedCekContext]: 400,
  [DsrErrorCode.DhContextRequired]: 400,
  [DsrErrorCode.InvalidInput]: 400,
};

import { makeEnum } from '@transcend-io/type-utils';

/**
 * Stable, machine-readable error codes for the DSR submission API
 * (`POST /v1/data-subject-request-bulk`).
 *
 * Surfaced to clients as `extensions.code` on GraphQL errors so they can branch
 * on the failure type without parsing the error message.
 */
export const DsrErrorCode = makeEnum({
  /**
   * A duplicate open request already exists for this data subject + type.
   *
   * Bulk submission returns {@link DsrRequestOutcome.AlreadyOpen} instead once
   * Phase 6a lands; exclude from the bulk error docs table. Kept for singular
   * submit compatibility.
   */
  DuplicateRequest: 'DUPLICATE_REQUEST',
  /**
   * An open parent request already exists for this data subject.
   *
   * Bulk submission stops emitting this once Phase 6a lands; exclude from the
   * bulk error docs table. Kept for singular submit compatibility.
   */
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
  /** DROP linkage identifiers do not cover the required identifier types. */
  DropIdentifierCoverageMismatch: 'DROP_IDENTIFIER_COVERAGE_MISMATCH',
  /** A concurrent bulk submission already created one or more of these requests. */
  ConcurrentSubmissionConflict: 'CONCURRENT_SUBMISSION_CONFLICT',
  /** The referenced DROP run does not exist. */
  DropRunNotFound: 'DROP_RUN_NOT_FOUND',
});

/** Type override */
export type DsrErrorCode = (typeof DsrErrorCode)[keyof typeof DsrErrorCode];

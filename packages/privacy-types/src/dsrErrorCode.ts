import { makeEnum } from '@transcend-io/type-utils';

/**
 * Stable, machine-readable error codes for the DSR submission API
 * (`POST /v1/data-subject-request-bulk`).
 *
 * Surfaced to clients as `extensions.code` on GraphQL errors so they can branch
 * on the failure type without parsing the error message.
 */
export const DsrErrorCode = makeEnum({
  /** The bulk submission included no request inputs. */
  NoInputsProvided: 'NO_INPUTS_PROVIDED',
  /** One or more requests have an invalid or missing workflowConfigId. */
  InvalidWorkflowConfigId: 'INVALID_WORKFLOW_CONFIG_ID',
  /** A request is missing a core identifier. */
  MissingCoreIdentifier: 'MISSING_CORE_IDENTIFIER',
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
  /** The referenced receipt email template does not exist. */
  ReceiptTemplateNotFound: 'RECEIPT_TEMPLATE_NOT_FOUND',
  /** DROP linkage identifiers do not cover the required identifier types. */
  DropIdentifierCoverageMismatch: 'DROP_IDENTIFIER_COVERAGE_MISMATCH',
  /** The same DROP record was claimed more than once in one submission. */
  DuplicateDropRecords: 'DUPLICATE_DROP_RECORDS',
  /** In-batch DROP rows sharing a dropRunId idempotency key carry mismatched identifiers. */
  InBatchDropIdempotencyKeyCollision: 'IN_BATCH_DROP_IDEMPOTENCY_KEY_COLLISION',
  /** `dropRecords` was provided without a `dropRunId`. */
  DropRecordsRequireDropRunId: 'DROP_RECORDS_REQUIRE_DROP_RUN_ID',
  /** The submission exceeds the per-request DROP record link limit. */
  MaxDropRecordsPerRequestExceeded: 'MAX_DROP_RECORDS_PER_REQUEST_EXCEEDED',
  /** One or more referenced DROP records are not part of the run's CPPA download. */
  UnknownDropRecords: 'UNKNOWN_DROP_RECORDS',
  /** A concurrent bulk submission already created one or more of these requests. */
  ConcurrentSubmissionConflict: 'CONCURRENT_SUBMISSION_CONFLICT',
  /** The referenced DROP run does not exist. */
  DropRunNotFound: 'DROP_RUN_NOT_FOUND',
});

/** Type override */
export type DsrErrorCode = (typeof DsrErrorCode)[keyof typeof DsrErrorCode];

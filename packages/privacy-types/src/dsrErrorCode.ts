import { makeEnum } from '@transcend-io/type-utils';

/**
 * Stable, machine-readable error codes for a single bulk submission input
 * (`POST /v1/data-subject-request-bulk` `input[]` item).
 *
 * Returned on one failed input so callers can branch without parsing the error
 * message. Failures about the bulk call as a whole use {@link DsrBulkErrorCode}.
 */
export const DsrErrorCode = makeEnum({
  /** This request has an invalid or missing workflowConfigId. */
  InvalidWorkflowConfigId: 'INVALID_WORKFLOW_CONFIG_ID',
  /** This request is missing a core identifier. */
  MissingCoreIdentifier: 'MISSING_CORE_IDENTIFIER',
  /** A restart was requested for a request ID that does not exist. */
  RestartRequestNotFound: 'RESTART_REQUEST_NOT_FOUND',
  /** A restart was requested for a request closed beyond the org's time limit. */
  RestartTimeLimitExceeded: 'RESTART_TIME_LIMIT_EXCEEDED',
  /** The referenced receipt email template does not exist. */
  ReceiptTemplateNotFound: 'RECEIPT_TEMPLATE_NOT_FOUND',
  /** DROP linkage identifiers on this request do not cover the required identifier types. */
  DropIdentifierCoverageMismatch: 'DROP_IDENTIFIER_COVERAGE_MISMATCH',
  /** The same DROP record was claimed more than once on this request. */
  DuplicateDropRecords: 'DUPLICATE_DROP_RECORDS',
  /** This request's DROP identifiers conflict with another input sharing a dropRunId idempotency key. */
  InBatchDropIdempotencyKeyCollision: 'IN_BATCH_DROP_IDEMPOTENCY_KEY_COLLISION',
  /** This request's `dropRecords` was provided without a `dropRunId`. */
  DropRecordsRequireDropRunId: 'DROP_RECORDS_REQUIRE_DROP_RUN_ID',
  /** This request exceeds the per-request DROP record link limit. */
  MaxDropRecordsPerRequestExceeded: 'MAX_DROP_RECORDS_PER_REQUEST_EXCEEDED',
  /** One or more DROP records on this request are not part of the run's CPPA download. */
  UnknownDropRecords: 'UNKNOWN_DROP_RECORDS',
  /** The DROP run referenced by this request does not exist. */
  DropRunNotFound: 'DROP_RUN_NOT_FOUND',
  /** The DROP run referenced by this request is in a state that no longer accepts new DROP-linked DSRs. */
  DropRunNotIntakeEligible: 'DROP_RUN_NOT_INTAKE_ELIGIBLE',
  /** An identifier value on this request failed format or regex validation. */
  IdentifierValidationFailed: 'IDENTIFIER_VALIDATION_FAILED',
  /** This request names an identifier the organization does not have configured. */
  UnsupportedIdentifierName: 'UNSUPPORTED_IDENTIFIER_NAME',
  /** This request has no email, which is required outside silent mode. */
  MissingRequiredEmail: 'MISSING_REQUIRED_EMAIL',
  /**
   * One or more `dataSiloIds` on this request are not connected to the
   * workflow config. `dataSiloIds` may only narrow the workflow's connected set.
   */
  DataSiloNotInWorkflow: 'DATA_SILO_NOT_IN_WORKFLOW',
});

/** Type override */
export type DsrErrorCode = (typeof DsrErrorCode)[keyof typeof DsrErrorCode];

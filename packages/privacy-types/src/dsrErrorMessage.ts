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
export const MAX_UNKNOWN_DROP_RECORDS_IN_ERROR = 20;

/**
 * Summary message when an entire bulk submission is rejected.
 */
export const DSR_BULK_SUBMISSION_REJECTED_MESSAGE =
  'The submission was rejected. No requests were created.';

/** Inputs for the {@link DsrErrorCode.RestartTimeLimitExceeded} message builder. */
export interface RestartTimeLimitExceededMessageInput {
  /** Days since the request's status last changed */
  daysSinceLastTransition: number;
  /** Organization-configured restart time limit in days */
  restartTimeLimitDays: number;
}

/** Inputs for the {@link DsrErrorCode.UnknownDropRecords} message builder. */
export interface UnknownDropRecordsMessageInput {
  /** DROP record identifier from the submission payload */
  dropRecordId: string;
  /** DROP list type for the referenced record */
  dropListType: DropListType;
}

/** Inputs for the {@link DsrErrorCode.DataSiloNotInWorkflow} message builder. */
export interface DataSiloNotInWorkflowMessageInput {
  /** Workflow config the submission targeted */
  workflowConfigId: string;
  /** dataSiloIds that are not connected to that workflow config */
  dataSiloIds: readonly string[];
}

/** Inputs for the {@link DsrErrorCode.TypeNotMatchingWorkflow} message builder. */
export interface TypeNotMatchingWorkflowMessageInput {
  /** Workflow config the submission targeted */
  workflowConfigId: string;
  /** The request action (`type`) asserted on the input */
  providedType: string;
  /** The workflow config's actual request action */
  workflowType: string;
}

/** Inputs for the {@link DsrErrorCode.SubjectTypeNotMatchingWorkflow} message builder. */
export interface SubjectTypeNotMatchingWorkflowMessageInput {
  /** Workflow config the submission targeted */
  workflowConfigId: string;
  /** The data subject type asserted on the input */
  providedSubjectType: string;
  /** The workflow config's actual data subject type */
  workflowSubjectType: string;
}

/** Inputs for the {@link DsrErrorCode.RegionNotInWorkflow} message builder. */
export interface RegionNotInWorkflowMessageInput {
  /** Human-readable rejected region (e.g. `GB` or `US/US-CA`) */
  region: string;
  /** Workflow regionList entries that are eligible */
  supportedRegions: readonly string[];
}

/** Canonical message builder for each {@link DsrErrorCode}. */
export type DsrErrorMessageMap = {
  [DsrErrorCode.InvalidWorkflowConfigId]: () => string;
  [DsrErrorCode.MissingCoreIdentifier]: () => string;
  [DsrErrorCode.RestartRequestNotFound]: () => string;
  [DsrErrorCode.RequestIdAlreadyExists]: () => string;
  [DsrErrorCode.RestartTimeLimitExceeded]: (input: RestartTimeLimitExceededMessageInput) => string;
  [DsrErrorCode.ReceiptTemplateNotFound]: (templateId: string) => string;
  [DsrErrorCode.DropIdentifierCoverageMismatch]: () => string;
  [DsrErrorCode.DuplicateDropRecords]: () => string;
  [DsrErrorCode.InBatchDropIdempotencyKeyCollision]: () => string;
  [DsrErrorCode.DropRecordsRequireDropRunId]: () => string;
  [DsrErrorCode.MaxDropRecordsPerRequestExceeded]: () => string;
  [DsrErrorCode.UnknownDropRecords]: (records: readonly UnknownDropRecordsMessageInput[]) => string;
  [DsrErrorCode.DropRunNotFound]: (dropRunId: string) => string;
  [DsrErrorCode.DropRunNotIntakeEligible]: (dropRunState: string) => string;
  [DsrErrorCode.IdentifierValidationFailed]: (identifierNames: readonly string[]) => string;
  [DsrErrorCode.UnsupportedIdentifierName]: (name: string) => string;
  [DsrErrorCode.MissingRequiredEmail]: () => string;
  [DsrErrorCode.DataSiloNotInWorkflow]: (input: DataSiloNotInWorkflowMessageInput) => string;
  [DsrErrorCode.TypeNotMatchingWorkflow]: (input: TypeNotMatchingWorkflowMessageInput) => string;
  [DsrErrorCode.SubjectTypeNotMatchingWorkflow]: (
    input: SubjectTypeNotMatchingWorkflowMessageInput,
  ) => string;
  [DsrErrorCode.RegionNotInWorkflow]: (input: RegionNotInWorkflowMessageInput) => string;
};

type _AssertAllCodesHaveBuilders = DsrErrorCode extends keyof DsrErrorMessageMap
  ? keyof DsrErrorMessageMap extends DsrErrorCode
    ? true
    : never
  : never;
const _assertAllCodesHaveBuilders: _AssertAllCodesHaveBuilders = true;

/**
 * Canonical per-input DSR bulk submission error messages.
 *
 * Each {@link DsrErrorCode} has exactly one builder; call
 * `DSR_ERROR_MESSAGE[code](...)` to render the runtime string for one failed
 * `input[]` item. Per-input errors currently surface as HTTP 400 bad-request
 * validation failures.
 */
export const DSR_ERROR_MESSAGE = {
  [DsrErrorCode.InvalidWorkflowConfigId]: () => 'Invalid workflowConfigId',
  [DsrErrorCode.MissingCoreIdentifier]: () => 'Missing core identifier',
  [DsrErrorCode.RestartRequestNotFound]: () => 'Cannot restart: request not found',
  [DsrErrorCode.RequestIdAlreadyExists]: () =>
    'A request with this requestId already exists. Pass isRestart: true to restart it.',
  [DsrErrorCode.RestartTimeLimitExceeded]: ({
    daysSinceLastTransition,
    restartTimeLimitDays,
  }: RestartTimeLimitExceededMessageInput) =>
    `This request's status last changed ${daysSinceLastTransition} days ago, which exceeds your organization's restart time limit of ${restartTimeLimitDays} days. Create a new request instead.`,
  [DsrErrorCode.ReceiptTemplateNotFound]: (templateId: string) =>
    `Could not find specified email template ID: ${templateId}`,
  [DsrErrorCode.DropIdentifierCoverageMismatch]: () =>
    'Cannot link DROP records to an existing request until every identifier on this submission is already on that request. Submit a new request that includes all required identifiers, or retry with only identifiers already on the existing request.',
  [DsrErrorCode.DuplicateDropRecords]: () =>
    'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.',
  [DsrErrorCode.InBatchDropIdempotencyKeyCollision]: () =>
    "This request's identifiers conflict with another input in the batch that shares the same dropRunId idempotency key.",
  [DsrErrorCode.DropRecordsRequireDropRunId]: () => 'dropRecords requires dropRunId',
  [DsrErrorCode.MaxDropRecordsPerRequestExceeded]: () =>
    `Cannot link more than ${MAX_DROP_RECORDS_PER_REQUEST} DROP records to a single request.`,
  [DsrErrorCode.UnknownDropRecords]: (records: readonly UnknownDropRecordsMessageInput[]) => {
    const named = records
      .slice(0, MAX_UNKNOWN_DROP_RECORDS_IN_ERROR)
      .map(({ dropRecordId, dropListType }) => `${dropRecordId} (${dropListType})`)
      .join(', ');
    const remainder =
      records.length > MAX_UNKNOWN_DROP_RECORDS_IN_ERROR
        ? ` and ${records.length - MAX_UNKNOWN_DROP_RECORDS_IN_ERROR} more`
        : '';
    return (
      `${records.length} DROP record(s) are not part of this run's CPPA ` +
      `download: ${named}${remainder}. Re-index the run's records, or ` +
      'download a fresh matched-records file and edit that.'
    );
  },
  [DsrErrorCode.DropRunNotFound]: (dropRunId: string) =>
    `Could not find DROP run with id "${dropRunId}"`,
  [DsrErrorCode.DropRunNotIntakeEligible]: (dropRunState: string) =>
    `Cannot submit DROP-linked DSRs while the run is in state ${dropRunState}`,
  /**
   * Fallback canonical message for {@link DsrErrorCode.IdentifierValidationFailed}.
   * Organizations can configure a custom, locale-translated `validationErrorMessage`
   * per identifier, so the runtime message on the error entry will often differ
   * from this string. Downstream consumers must branch on `code` and display the
   * returned `message` — never reconstruct it from `DSR_ERROR_MESSAGE`.
   */
  [DsrErrorCode.IdentifierValidationFailed]: (identifierNames: readonly string[]) =>
    `${identifierNames.join(', ')} did not pass validation`,
  [DsrErrorCode.UnsupportedIdentifierName]: (name: string) =>
    `The organization does not support identifiers with name: "${name}" at time of request submission.`,
  [DsrErrorCode.MissingRequiredEmail]: () =>
    'At least one email must be provided before a request can be created when not in silent mode',
  [DsrErrorCode.DataSiloNotInWorkflow]: ({
    workflowConfigId,
    dataSiloIds,
  }: DataSiloNotInWorkflowMessageInput) =>
    `The following dataSiloIds are not connected to the workflow config ` +
    `"${workflowConfigId}": ${dataSiloIds.join(', ')}. ` +
    `dataSiloIds may only narrow the workflow's connected data silos.`,
  [DsrErrorCode.TypeNotMatchingWorkflow]: ({
    workflowConfigId,
    providedType,
    workflowType,
  }: TypeNotMatchingWorkflowMessageInput) =>
    `The provided type "${providedType}" does not match the request action ` +
    `"${workflowType}" of workflow config "${workflowConfigId}". ` +
    `Omit type to derive it from the workflow config.`,
  [DsrErrorCode.SubjectTypeNotMatchingWorkflow]: ({
    workflowConfigId,
    providedSubjectType,
    workflowSubjectType,
  }: SubjectTypeNotMatchingWorkflowMessageInput) =>
    `The provided subjectType "${providedSubjectType}" does not match the ` +
    `data subject type "${workflowSubjectType}" of workflow config ` +
    `"${workflowConfigId}". Omit subjectType to derive it from the workflow config.`,
  [DsrErrorCode.RegionNotInWorkflow]: ({
    region,
    supportedRegions,
  }: RegionNotInWorkflowMessageInput) =>
    `Region "${region}" is not eligible for this workflow. ` +
    `Supported regions: ${supportedRegions.join(', ')}.`,
} as const satisfies DsrErrorMessageMap;

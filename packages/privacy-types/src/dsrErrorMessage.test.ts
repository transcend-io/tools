import { describe, expect, it } from 'vitest';

import { DropListType } from './drop.js';
import {
  DSR_BULK_SUBMISSION_REJECTED_MESSAGE,
  DSR_ERROR_MESSAGE,
  DsrErrorCode,
  MAX_DROP_RECORDS_PER_REQUEST,
  MAX_DSR_BULK_SUBMISSION_ERRORS,
  MAX_UNKNOWN_DROP_RECORDS_IN_ERROR,
} from './index.js';

const DSR_ERROR_MESSAGE_CODES = Object.values(DsrErrorCode);

describe('DSR_ERROR_MESSAGE', () => {
  it('defines a builder for every code', () => {
    for (const code of DSR_ERROR_MESSAGE_CODES) {
      expect(DSR_ERROR_MESSAGE[code]).toBeTypeOf('function');
    }
  });

  it('exports bulk submission rejection constants', () => {
    expect(DSR_BULK_SUBMISSION_REJECTED_MESSAGE).toBe(
      'The submission was rejected. No requests were created.',
    );
  });

  it('exports MAX_DSR_BULK_SUBMISSION_ERRORS', () => {
    expect(MAX_DSR_BULK_SUBMISSION_ERRORS).toBe(20);
  });

  it('interpolates numeric limits from exported constants', () => {
    expect(MAX_DROP_RECORDS_PER_REQUEST).toBe(500);
    expect(MAX_UNKNOWN_DROP_RECORDS_IN_ERROR).toBe(20);
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.MaxDropRecordsPerRequestExceeded]()).toBe(
      `Cannot link more than ${MAX_DROP_RECORDS_PER_REQUEST} DROP records to a single request.`,
    );
  });

  it('renders canonical per-request static messages', () => {
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.InvalidWorkflowConfigId]()).toBe(
      'Invalid workflowConfigId',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.MissingCoreIdentifier]()).toBe('Missing core identifier');
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.RestartRequestNotFound]()).toBe(
      'Cannot restart: request not found',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DropIdentifierCoverageMismatch]()).toBe(
      'Cannot link DROP records to an existing request until every identifier on this submission is already on that request. Submit a new request that includes all required identifiers, or retry with only identifiers already on the existing request.',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DuplicateDropRecords]()).toBe(
      'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.InBatchDropIdempotencyKeyCollision]()).toBe(
      "This request's identifiers conflict with another input in the batch that shares the same dropRunId idempotency key.",
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DropRecordsRequireDropRunId]()).toBe(
      'dropRecords requires dropRunId',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.MissingRequiredEmail]()).toBe(
      'At least one email must be provided before a request can be created when not in silent mode',
    );
  });

  it('renders parameterized per-request messages', () => {
    expect(
      DSR_ERROR_MESSAGE[DsrErrorCode.RestartTimeLimitExceeded]({
        daysSinceLastTransition: 45,
        restartTimeLimitDays: 30,
      }),
    ).toBe(
      "This request's status last changed 45 days ago, which exceeds your organization's restart time limit of 30 days. Create a new request instead.",
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DropRunNotFound]('run-123')).toBe(
      'Could not find DROP run with id "run-123"',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.ReceiptTemplateNotFound]('template-456')).toBe(
      'Could not find specified email template ID: template-456',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.IdentifierValidationFailed](['Email'])).toBe(
      'Email did not pass validation',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.IdentifierValidationFailed](['Email', 'Phone'])).toBe(
      'Email, Phone did not pass validation',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.UnsupportedIdentifierName]('custom-username')).toBe(
      'The organization does not support identifiers with name: "custom-username" at time of request submission.',
    );
  });

  it('renders UnknownDropRecords with truncation at MAX_UNKNOWN_DROP_RECORDS_IN_ERROR', () => {
    const records = Array.from({ length: MAX_UNKNOWN_DROP_RECORDS_IN_ERROR }, (_, index) => ({
      dropRecordId: `record-${index}`,
      dropListType: DropListType.Email,
    }));

    expect(DSR_ERROR_MESSAGE[DsrErrorCode.UnknownDropRecords](records)).toBe(
      `${MAX_UNKNOWN_DROP_RECORDS_IN_ERROR} DROP record(s) are not part of this run's CPPA download: ${records
        .map(({ dropRecordId, dropListType }) => `${dropRecordId} (${dropListType})`)
        .join(
          ', ',
        )}. Re-index the run's records, or download a fresh matched-records file and edit that.`,
    );

    const truncatedRecords = [
      ...records,
      { dropRecordId: 'record-extra', dropListType: DropListType.Phone },
    ];

    expect(DSR_ERROR_MESSAGE[DsrErrorCode.UnknownDropRecords](truncatedRecords)).toBe(
      `${MAX_UNKNOWN_DROP_RECORDS_IN_ERROR + 1} DROP record(s) are not part of this run's CPPA download: ${records
        .map(({ dropRecordId, dropListType }) => `${dropRecordId} (${dropListType})`)
        .join(
          ', ',
        )} and 1 more. Re-index the run's records, or download a fresh matched-records file and edit that.`,
    );
  });
});

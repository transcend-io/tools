import { describe, expect, it } from 'vitest';

import { DropListType } from './drop.js';
import {
  DSR_ERROR_MESSAGE,
  DsrErrorCode,
  MAX_DROP_RECORDS_PER_REQUEST,
  MAX_UNKNOWN_DROP_RECORDS_IN_ERROR,
  REQUEST_SUBMISSION_LIMIT,
} from './index.js';

const DSR_ERROR_MESSAGE_CODES = Object.values(DsrErrorCode);

describe('DSR_ERROR_MESSAGE', () => {
  it('defines a builder for every code', () => {
    for (const code of DSR_ERROR_MESSAGE_CODES) {
      expect(DSR_ERROR_MESSAGE[code]).toBeTypeOf('function');
    }
  });

  it('interpolates numeric limits from exported constants', () => {
    expect(MAX_DROP_RECORDS_PER_REQUEST).toBe(500);
    expect(REQUEST_SUBMISSION_LIMIT).toBe(100);
    expect(MAX_UNKNOWN_DROP_RECORDS_IN_ERROR).toBe(20);
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.SubmissionLimitExceeded]()).toBe(
      `Cannot submit more than ${REQUEST_SUBMISSION_LIMIT} requests at once. Please split your requests into smaller batches and try again.`,
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.MaxDropRecordsPerRequestExceeded]()).toBe(
      `Cannot link more than ${MAX_DROP_RECORDS_PER_REQUEST} DROP records to a single request.`,
    );
  });

  it('renders canonical static messages', () => {
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.NoInputsProvided]()).toBe('No inputs provided');
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.InvalidWorkflowConfigId]()).toBe(
      'All requests must have a valid workflowConfigId',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.MissingCoreIdentifier]()).toBe('Missing core identifier');
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DhContextRequired]()).toBe(
      'No encrypted data subject payload provided',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DropIdentifierCoverageMismatch]()).toBe(
      'Cannot link DROP records to an existing request until every identifier on this submission is already on that request. Submit a new request that includes all required identifiers, or retry with only identifiers already on the existing request.',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.ConcurrentSubmissionConflict]()).toBe(
      'A concurrent DROP submission already created one or more of these requests. Retry the batch.',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.MixedCekContext]()).toBe(
      'Either all or none of the requests must include encryptedCEKContext',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DuplicateDropRecords]()).toBe(
      'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.InBatchDropIdempotencyKeyCollision]()).toBe(
      'In-batch DROP rows that share a dropRunId idempotency key must carry the same identifier values.',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DropRecordsRequireDropRunId]()).toBe(
      'dropRecords requires dropRunId',
    );
  });

  it('renders parameterized code messages', () => {
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.RestartRequestNotFound](['req-1', 'req-2'])).toBe(
      'Cannot restart: request(s) not found for ID(s): req-1, req-2',
    );
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

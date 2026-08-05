import { describe, expect, it } from 'vitest';

import {
  DSR_ERROR_MESSAGE,
  DsrErrorCode,
  MAX_DROP_RECORDS_PER_REQUEST,
  REQUEST_SUBMISSION_LIMIT,
} from './index.js';

const DSR_ERROR_MESSAGE_CODES = Object.values(DsrErrorCode).filter(
  (code) => code !== DsrErrorCode.InvalidInput,
);

describe('DSR_ERROR_MESSAGE', () => {
  it('defines a builder for every code except INVALID_INPUT', () => {
    for (const code of DSR_ERROR_MESSAGE_CODES) {
      expect(DSR_ERROR_MESSAGE[code]).toBeTypeOf('function');
    }
  });

  it('interpolates numeric limits from exported constants', () => {
    expect(MAX_DROP_RECORDS_PER_REQUEST).toBe(500);
    expect(REQUEST_SUBMISSION_LIMIT).toBe(100);
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.SubmissionLimitExceeded]()).toBe(
      `Cannot submit more than ${REQUEST_SUBMISSION_LIMIT} requests at once. Please split your requests into smaller batches and try again.`,
    );
    expect(DSR_ERROR_MESSAGE.invalidInput.maxDropRecordsPerRequestExceeded()).toBe(
      `Cannot link more than ${MAX_DROP_RECORDS_PER_REQUEST} DROP records to a single request.`,
    );
  });

  it('renders canonical static messages', () => {
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DuplicateRequest]()).toBe(
      'You have already made this request.',
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.OpenParentRequestExists]()).toBe(
      'An open parent request already exists',
    );
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
  });

  it('renders INVALID_INPUT validation messages', () => {
    expect(DSR_ERROR_MESSAGE.invalidInput.duplicateDropRecords()).toBe(
      'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.',
    );
    expect(DSR_ERROR_MESSAGE.invalidInput.inBatchDropIdempotencyKeyCollision()).toBe(
      'In-batch DROP rows that share a dropRunId idempotency key must carry the same identifier values.',
    );
    expect(DSR_ERROR_MESSAGE.invalidInput.dropRecordsRequireDropRunId()).toBe(
      'dropRecords requires dropRunId',
    );
  });
});

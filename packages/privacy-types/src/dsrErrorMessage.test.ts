import { describe, expect, it } from 'vitest';

import {
  CONCURRENT_DROP_SUBMISSION_MESSAGE,
  DH_CONTEXT_REQUIRED_MESSAGE,
  DROP_IDENTIFIER_COVERAGE_MISMATCH_MESSAGE,
  DROP_RECORDS_REQUIRE_DROP_RUN_ID_MESSAGE,
  DUPLICATE_DROP_RECORDS_MESSAGE,
  DUPLICATE_REQUEST_MESSAGE,
  DSR_ERROR_HTTP_STATUS,
  DSR_ERROR_MESSAGE,
  DsrErrorCode,
  IN_BATCH_DROP_IDEMPOTENCY_KEY_COLLISION_MESSAGE,
  MAX_DROP_RECORDS_PER_REQUEST,
  OPEN_PARENT_REQUEST_EXISTS_MESSAGE,
  REQUEST_SUBMISSION_LIMIT,
  dropRunNotFoundMessage,
  maxDropRecordsPerRequestExceededMessage,
  requestSubmissionThresholdExceededMessage,
  restartRequestsNotFoundMessage,
  restartTimeLimitExceededMessage,
} from './index.js';

const STATIC_DSR_ERROR_MESSAGE_CODES = [
  DsrErrorCode.DuplicateRequest,
  DsrErrorCode.OpenParentRequestExists,
  DsrErrorCode.SubmissionLimitExceeded,
  DsrErrorCode.DhContextRequired,
  DsrErrorCode.DropIdentifierCoverageMismatch,
  DsrErrorCode.ConcurrentSubmissionConflict,
] as const satisfies readonly DsrErrorCode[];

describe('DsrErrorCode', () => {
  it('exports the two new DROP submission error codes', () => {
    expect(Object.values(DsrErrorCode)).toContain('CONCURRENT_SUBMISSION_CONFLICT');
    expect(Object.values(DsrErrorCode)).toContain('DROP_RUN_NOT_FOUND');
  });
});

describe('DSR_ERROR_MESSAGE', () => {
  it('maps exactly the static one-to-one codes', () => {
    expect(Object.keys(DSR_ERROR_MESSAGE).sort()).toEqual(
      [...STATIC_DSR_ERROR_MESSAGE_CODES].sort(),
    );
  });

  it('maps each static code to its canonical message', () => {
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DuplicateRequest]).toBe(DUPLICATE_REQUEST_MESSAGE);
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.OpenParentRequestExists]).toBe(
      OPEN_PARENT_REQUEST_EXISTS_MESSAGE,
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.SubmissionLimitExceeded]).toBe(
      requestSubmissionThresholdExceededMessage(),
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DhContextRequired]).toBe(DH_CONTEXT_REQUIRED_MESSAGE);
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.DropIdentifierCoverageMismatch]).toBe(
      DROP_IDENTIFIER_COVERAGE_MISMATCH_MESSAGE,
    );
    expect(DSR_ERROR_MESSAGE[DsrErrorCode.ConcurrentSubmissionConflict]).toBe(
      CONCURRENT_DROP_SUBMISSION_MESSAGE,
    );
  });
});

describe('DSR_ERROR_HTTP_STATUS', () => {
  it('maps each error code to its HTTP status', () => {
    expect(DSR_ERROR_HTTP_STATUS).toEqual({
      [DsrErrorCode.DuplicateRequest]: 400,
      [DsrErrorCode.OpenParentRequestExists]: 400,
      [DsrErrorCode.RestartRequestNotFound]: 400,
      [DsrErrorCode.RestartTimeLimitExceeded]: 400,
      [DsrErrorCode.SubmissionLimitExceeded]: 400,
      [DsrErrorCode.MixedCekContext]: 400,
      [DsrErrorCode.DhContextRequired]: 400,
      [DsrErrorCode.InvalidInput]: 400,
      [DsrErrorCode.DropIdentifierCoverageMismatch]: 400,
      [DsrErrorCode.ConcurrentSubmissionConflict]: 400,
      [DsrErrorCode.DropRunNotFound]: 400,
    });
  });
});

describe('DSR error message builders and limits', () => {
  it('exports numeric limits', () => {
    expect(MAX_DROP_RECORDS_PER_REQUEST).toBe(500);
    expect(REQUEST_SUBMISSION_LIMIT).toBe(100);
  });

  it('exports static DROP validation messages', () => {
    expect(DUPLICATE_DROP_RECORDS_MESSAGE).toBe(
      'dropRecords contains duplicate (dropRecordId, dropListType) entries: each DROP record can only be linked to one request per submission.',
    );
    expect(IN_BATCH_DROP_IDEMPOTENCY_KEY_COLLISION_MESSAGE).toBe(
      'In-batch DROP rows that share a dropRunId idempotency key must carry the same identifier values.',
    );
    expect(DROP_RECORDS_REQUIRE_DROP_RUN_ID_MESSAGE).toBe('dropRecords requires dropRunId');
    expect(CONCURRENT_DROP_SUBMISSION_MESSAGE).toBe(
      'A concurrent DROP submission already created one or more of these requests. Retry the batch.',
    );
  });

  it('builds interpolated messages from the same limits as runtime', () => {
    expect(maxDropRecordsPerRequestExceededMessage()).toBe(
      'Cannot link more than 500 DROP records to a single request.',
    );
    expect(requestSubmissionThresholdExceededMessage()).toBe(
      'Cannot submit more than 100 requests at once. Please split your requests into smaller batches and try again.',
    );
    expect(restartRequestsNotFoundMessage(['req-1', 'req-2'])).toBe(
      'Cannot restart: request(s) not found for ID(s): req-1, req-2',
    );
    expect(
      restartTimeLimitExceededMessage({
        daysSinceLastTransition: 45,
        restartTimeLimitDays: 30,
      }),
    ).toBe(
      "This request's status last changed 45 days ago, which exceeds your organization's restart time limit of 30 days. Create a new request instead.",
    );
    expect(dropRunNotFoundMessage('run-123')).toBe('Could not find DROP run with id "run-123"');
  });
});

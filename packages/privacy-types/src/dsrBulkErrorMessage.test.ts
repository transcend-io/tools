import { describe, expect, it } from 'vitest';

import { DropListType } from './drop.js';
import { DSR_BULK_ERROR_MESSAGE, DsrBulkErrorCode, REQUEST_SUBMISSION_LIMIT } from './index.js';

const DSR_BULK_ERROR_MESSAGE_CODES = Object.values(DsrBulkErrorCode);

describe('DSR_BULK_ERROR_MESSAGE', () => {
  it('defines a builder for every bulk error code', () => {
    for (const code of DSR_BULK_ERROR_MESSAGE_CODES) {
      expect(DSR_BULK_ERROR_MESSAGE[code]).toBeTypeOf('function');
    }
  });

  it('interpolates REQUEST_SUBMISSION_LIMIT', () => {
    expect(DSR_BULK_ERROR_MESSAGE[DsrBulkErrorCode.SubmissionLimitExceeded]()).toBe(
      `Cannot submit more than ${REQUEST_SUBMISSION_LIMIT} requests at once. Please split your requests into smaller batches and try again.`,
    );
  });

  it('renders canonical bulk error messages', () => {
    expect(DSR_BULK_ERROR_MESSAGE[DsrBulkErrorCode.NoInputsProvided]()).toBe('No inputs provided');
    expect(DSR_BULK_ERROR_MESSAGE[DsrBulkErrorCode.MixedCekContext]()).toBe(
      'Either all or none of the requests must include encryptedCEKContext',
    );
  });
});

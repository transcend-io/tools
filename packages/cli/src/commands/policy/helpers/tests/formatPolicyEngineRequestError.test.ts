import { describe, expect, it } from 'vitest';

import { formatPolicyEngineRequestError } from '../formatPolicyEngineRequestError.js';

describe('formatPolicyEngineRequestError', () => {
  it('extracts the message from a JSON error body string', () => {
    const error = {
      response: {
        body: JSON.stringify({
          message:
            'Policy bundle contains invalid Rego: policy.rego:5: var cannot be used for rule name.',
        }),
      },
    };

    expect(formatPolicyEngineRequestError(error)).toBe(
      'Policy bundle contains invalid Rego: policy.rego:5: var cannot be used for rule name.',
    );
  });

  it('extracts the message from a parsed JSON error body', () => {
    const error = {
      response: {
        body: {
          message: 'Missing required field "bundleName".',
        },
      },
    };

    expect(formatPolicyEngineRequestError(error)).toBe('Missing required field "bundleName".');
  });

  it('falls back to the error message when no response body is present', () => {
    expect(formatPolicyEngineRequestError(new Error('network failure'))).toBe('network failure');
  });
});

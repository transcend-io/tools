import { describe, expect, it } from 'vitest';

import {
  formatPolicyEngineRequestError,
  policyEngineRequest,
  throwPolicyEngineRequestError,
} from '../formatPolicyEngineRequestError.js';

describe('formatPolicyEngineRequestError', () => {
  it('extracts the message from a JSON error body string', () => {
    const error = {
      response: {
        statusCode: 422,
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
        statusCode: 400,
        body: {
          message: 'Missing required field "bundleName".',
        },
      },
    };

    expect(formatPolicyEngineRequestError(error)).toBe('Missing required field "bundleName".');
  });

  it('returns an actionable auth message for 401 responses', () => {
    const error = {
      response: {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing required scope.' }),
      },
      message:
        'Request failed with status code 401 (Unauthorized): GET https://api.transcend.io/v1/policy-engine/policy-bundles',
    };

    const message = formatPolicyEngineRequestError(error);

    expect(message).toContain('Authentication failed (401 Unauthorized).');
    expect(message).toContain('TRANSCEND_API_KEY');
    expect(message).toContain('--auth=');
    expect(message).not.toContain('got');
  });

  it('returns an actionable permission message for 403 responses', () => {
    const error = {
      response: {
        statusCode: 403,
        body: JSON.stringify({ message: 'Forbidden' }),
      },
    };

    const message = formatPolicyEngineRequestError(error);

    expect(message).toContain('Permission denied (403 Forbidden).');
    expect(message).toContain('Policy Engine scopes');
  });

  it('returns an actionable not-found message for 404 responses', () => {
    const error = {
      response: {
        statusCode: 404,
        body: JSON.stringify({ message: 'Not found' }),
      },
    };

    const message = formatPolicyEngineRequestError(error);

    expect(message).toContain('Resource not found (404 Not Found).');
    expect(message).toContain('transcend policy bundles');
  });

  it('prefers the API message for 409 responses', () => {
    const error = {
      response: {
        statusCode: 409,
        body: JSON.stringify({ message: 'Version already active.' }),
      },
    };

    expect(formatPolicyEngineRequestError(error)).toBe('Version already active.');
  });

  it('returns a fallback message for 409 when the API body has no message', () => {
    const error = {
      response: {
        statusCode: 409,
        body: JSON.stringify({}),
      },
    };

    expect(formatPolicyEngineRequestError(error)).toContain('conflicted with the current policy');
  });

  it('returns a network message for connectivity failures', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:443');
    (error as NodeJS.ErrnoException).code = 'ECONNREFUSED';

    const message = formatPolicyEngineRequestError(error);

    expect(message).toContain('Connection to Transcend failed.');
    expect(message).toContain('--transcend-url');
  });

  it('falls back to the error message when no response body is present', () => {
    expect(formatPolicyEngineRequestError(new Error('unexpected failure'))).toBe(
      'unexpected failure',
    );
  });
});

describe('throwPolicyEngineRequestError', () => {
  it('throws a plain Error with a formatted message and cause', () => {
    const httpError = {
      response: {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
      },
    };

    expect(() => throwPolicyEngineRequestError(httpError)).toThrow(
      /Authentication failed \(401 Unauthorized\)/,
    );

    try {
      throwPolicyEngineRequestError(httpError);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe('Error');
      expect((error as Error).cause).toBe(httpError);
    }
  });
});

describe('policyEngineRequest', () => {
  it('returns the resolved value when the request succeeds', async () => {
    await expect(policyEngineRequest(Promise.resolve({ ok: true }))).resolves.toEqual({ ok: true });
  });

  it('maps request failures to user-readable errors', async () => {
    const httpError = {
      response: {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized' }),
      },
    };

    await expect(policyEngineRequest(Promise.reject(httpError))).rejects.toThrow(
      /Authentication failed \(401 Unauthorized\)/,
    );
  });
});

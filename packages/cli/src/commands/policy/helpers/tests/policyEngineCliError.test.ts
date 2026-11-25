import { afterEach, describe, expect, it } from 'vitest';

import {
  formatCliException,
  formatPolicyEngineCliErrorForTerminal,
  formatPolicyEngineCliException,
  PolicyEngineCliError,
  setPolicyEngineCliDebug,
} from '../policyEngineCliError.js';

describe('PolicyEngineCliError', () => {
  afterEach(() => {
    setPolicyEngineCliDebug(false);
  });

  it('returns only the user message by default', () => {
    const cause = new Error('Request failed with status code 401 (Unauthorized)');

    expect(
      formatPolicyEngineCliErrorForTerminal(
        new PolicyEngineCliError('Authentication failed (401 Unauthorized).', { cause }),
      ),
    ).toBe('Authentication failed (401 Unauthorized).');
  });

  it('includes debug details when --debug is enabled', () => {
    setPolicyEngineCliDebug(true);
    const cause = new Error('Request failed with status code 401 (Unauthorized)');

    const message = formatPolicyEngineCliErrorForTerminal(
      new PolicyEngineCliError('Authentication failed (401 Unauthorized).', { cause }),
    );

    expect(message).toContain('Authentication failed (401 Unauthorized).');
    expect(message).toContain('Debug details:');
    expect(message).toContain('401 (Unauthorized)');
  });

  it('formats policy CLI errors for Stricli without a stack by default', () => {
    const error = new PolicyEngineCliError('Authentication failed (401 Unauthorized).');

    expect(formatPolicyEngineCliException(error)).toBe('Authentication failed (401 Unauthorized).');
    expect(formatPolicyEngineCliException(error)).not.toContain('at ');
  });

  it('returns undefined for non-policy errors', () => {
    expect(formatPolicyEngineCliException(new Error('other failure'))).toBeUndefined();
  });

  describe('formatCliException', () => {
    it('suppresses the stack for plain Errors by default, showing only the message', () => {
      const error = new Error('Policy bundle "missing" was not found for this organization.');

      expect(formatCliException(error)).toBe(
        'Policy bundle "missing" was not found for this organization.',
      );
      expect(formatCliException(error)).not.toContain('at ');
    });

    it('includes the stack for plain Errors when --debug is enabled', () => {
      setPolicyEngineCliDebug(true);
      const error = new Error('boom');

      const message = formatCliException(error);

      expect(message).toContain('boom');
      expect(message).toContain('at ');
    });

    it('delegates PolicyEngineCliError to the policy formatter (no stack by default)', () => {
      const error = new PolicyEngineCliError('Authentication failed (401 Unauthorized).');

      expect(formatCliException(error)).toBe('Authentication failed (401 Unauthorized).');
      expect(formatCliException(error)).not.toContain('at ');
    });

    it('stringifies non-Error thrown values', () => {
      expect(formatCliException('a string failure')).toBe('a string failure');
      expect(formatCliException(undefined)).toBe('undefined');
    });
  });
});

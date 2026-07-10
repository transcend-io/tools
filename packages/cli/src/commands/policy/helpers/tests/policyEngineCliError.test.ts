import { afterEach, describe, expect, it } from 'vitest';

import {
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
});

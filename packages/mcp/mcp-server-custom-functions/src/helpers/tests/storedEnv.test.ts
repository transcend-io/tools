import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import { buildReadableVersionContext } from '../readableCustomFunctionVersion.js';
import { classifyStoredEnv } from '../storedEnv.js';

/** Minimal unsigned JWT-shaped string for decode tests only. */
function fakeContextJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' }), 'utf8').toString('base64url');
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${header}.${body}.test`;
}

describe(classifyStoredEnv, () => {
  it('marks every legacy merged key as secret regardless of name', () => {
    expect(
      classifyStoredEnv(
        { userDefinedEncryptedEnv: { MY_PLAIN_VAR: 'cipher' } },
        { allowedHosts: [], userDefinedEnv: { MY_PLAIN_VAR: 'x' } },
      ),
    ).toEqual([{ key: 'MY_PLAIN_VAR', value: 'x', isSecret: true }]);
  });
});

describe(buildReadableVersionContext, () => {
  it('never returns secret values for legacy merged env', () => {
    const jwt = fakeContextJwt({
      userDefinedEncryptedEnv: { TOKEN: 'cipher' },
      allowedHosts: [],
    });
    const readable = buildReadableVersionContext(jwt, {
      allowedHosts: [],
      userDefinedEnv: { TOKEN: 'secret-value' },
    });
    expect(readable.environmentVariables).toEqual([{ key: 'TOKEN', isSecret: true, isSet: true }]);
    expect(JSON.stringify(readable)).not.toContain('secret-value');
  });
});

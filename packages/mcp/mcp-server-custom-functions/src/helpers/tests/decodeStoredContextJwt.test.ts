import { describe, expect, it } from 'vitest';

import {
  decodeStoredContextJwt,
  envKeyNamesFromStoredContext,
  storedContextUsesSplitEnv,
} from '../decodeStoredContextJwt.js';

/** Minimal unsigned JWT-shaped string for decode tests only. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' }), 'utf8').toString('base64url');
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${header}.${body}.`;
}

describe(decodeStoredContextJwt, () => {
  it('reads split-map fields from a context JWT payload', () => {
    const payload = decodeStoredContextJwt(
      fakeJwt({
        userDefinedEncryptedEnv: { API_KEY: 'cipher' },
        userDefinedPlaintextEnv: { HOST: 'https://example.com' },
        allowedHosts: [],
      }),
    );
    expect(payload).toBeDefined();
    expect(storedContextUsesSplitEnv(payload!)).toBe(true);
    expect(envKeyNamesFromStoredContext(payload!)).toEqual(['API_KEY', 'HOST']);
  });

  it('treats missing userDefinedPlaintextEnv as legacy', () => {
    const payload = decodeStoredContextJwt(
      fakeJwt({
        userDefinedEncryptedEnv: { API_KEY: 'cipher' },
        allowedHosts: [],
      }),
    );
    expect(storedContextUsesSplitEnv(payload!)).toBe(false);
  });
});

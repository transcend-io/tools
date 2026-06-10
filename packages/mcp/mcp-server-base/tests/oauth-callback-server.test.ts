import { describe, expect, it } from 'vitest';

import { startCallbackServer } from '../src/oauth/callback-server.js';
import { generateOAuthState } from '../src/oauth/pkce.js';

describe('startCallbackServer', () => {
  it('accepts a valid callback and returns the authorization code', async () => {
    const state = generateOAuthState();
    const handle = await startCallbackServer({ expectedState: state, timeoutMs: 5000 });

    try {
      const response = await fetch(
        `${handle.redirectUri}?code=auth-code-123&state=${encodeURIComponent(state)}`,
      );
      expect(response.status).toBe(200);

      const result = await handle.waitForCallback();
      expect(result.code).toBe('auth-code-123');
      expect(result.state).toBe(state);
    } finally {
      await handle.close();
    }
  });

  it('rejects callbacks with a state mismatch', async () => {
    const handle = await startCallbackServer({
      expectedState: 'expected-state',
      timeoutMs: 5000,
    });

    try {
      const assertion = expect(handle.waitForCallback()).rejects.toThrow(/state mismatch/i);
      await fetch(`${handle.redirectUri}?code=auth-code-123&state=wrong-state`);
      await assertion;
    } finally {
      await handle.close();
    }
  });
});

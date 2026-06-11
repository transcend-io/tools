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
      expect(await response.text()).toContain('Authentication complete');

      const result = await handle.waitForCallback();
      expect(result.code).toBe('auth-code-123');
      expect(result.state).toBe(state);
    } finally {
      await handle.close();
    }
  });

  it('auto-closes after a successful callback', async () => {
    const state = generateOAuthState();
    const handle = await startCallbackServer({ expectedState: state, timeoutMs: 5000 });

    await fetch(`${handle.redirectUri}?code=auth-code-123&state=${encodeURIComponent(state)}`);
    await handle.waitForCallback();

    await expect(
      fetch(`${handle.redirectUri}?code=ignored&state=${encodeURIComponent(state)}`),
    ).rejects.toThrow();
  });

  it('serves success HTML for duplicate callbacks after settlement', async () => {
    const state = generateOAuthState();
    const handle = await startCallbackServer({ expectedState: state, timeoutMs: 5000 });
    const callbackUrl = `${handle.redirectUri}?code=auth-code-123&state=${encodeURIComponent(state)}`;

    try {
      const [first, duplicate] = await Promise.all([fetch(callbackUrl), fetch(callbackUrl)]);
      expect(first.status).toBe(200);
      expect(duplicate.status).toBe(200);
      expect(await duplicate.text()).toContain('Authentication complete');

      const result = await handle.waitForCallback();
      expect(result.code).toBe('auth-code-123');
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
      const response = await fetch(`${handle.redirectUri}?code=auth-code-123&state=wrong-state`);
      expect(response.status).toBe(400);
      await assertion;
    } finally {
      await handle.close();
    }
  });

  it('rejects OAuth error query parameters from the authorization server', async () => {
    const state = generateOAuthState();
    const handle = await startCallbackServer({ expectedState: state, timeoutMs: 5000 });

    try {
      const assertion = expect(handle.waitForCallback()).rejects.toThrow(/access_denied/i);
      const response = await fetch(
        `${handle.redirectUri}?error=access_denied&error_description=User%20denied&state=${encodeURIComponent(state)}`,
      );
      expect(response.status).toBe(400);
      await assertion;
    } finally {
      await handle.close();
    }
  });

  it('rejects callbacks missing an authorization code', async () => {
    const state = generateOAuthState();
    const handle = await startCallbackServer({ expectedState: state, timeoutMs: 5000 });

    try {
      const assertion = expect(handle.waitForCallback()).rejects.toThrow(
        /missing authorization code/i,
      );
      const response = await fetch(`${handle.redirectUri}?state=${encodeURIComponent(state)}`);
      expect(response.status).toBe(400);
      await assertion;
    } finally {
      await handle.close();
    }
  });

  it('returns 405 for non-GET requests', async () => {
    const handle = await startCallbackServer({
      expectedState: 'expected-state',
      timeoutMs: 5000,
    });

    try {
      const response = await fetch(handle.redirectUri, { method: 'POST' });
      expect(response.status).toBe(405);
    } finally {
      await handle.close();
    }
  });

  it('returns 404 for non-callback paths', async () => {
    const handle = await startCallbackServer({
      expectedState: 'expected-state',
      timeoutMs: 5000,
    });

    try {
      const response = await fetch(`http://127.0.0.1:${handle.port}/other`);
      expect(response.status).toBe(404);
    } finally {
      await handle.close();
    }
  });
});

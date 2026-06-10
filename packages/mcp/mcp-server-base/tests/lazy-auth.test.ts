import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import {
  ensureLazyOAuthAuth,
  isLazyOAuthSessionReady,
  resetLazyOAuthState,
} from '../src/oauth/lazy-auth.js';
import * as oauthFlow from '../src/oauth/oauth-flow.js';

describe('ensureLazyOAuthAuth', () => {
  const logger = new SimpleLogger();
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;

  beforeEach(() => {
    resetLazyOAuthState();
    vi.restoreAllMocks();
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
  });

  afterEach(() => {
    resetLazyOAuthState();
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;
  });

  it('no-ops when OAuth mode is disabled', async () => {
    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin');
    await ensureLazyOAuthAuth(logger);
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('runs OAuth login once and marks the session ready', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';

    const waitForCallback = vi.fn().mockResolvedValue({ code: 'abc', state: 'xyz' });
    const close = vi.fn().mockResolvedValue(undefined);
    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue({
      redirectUri: 'http://127.0.0.1:1/callback',
      clientId: 'client',
      codeVerifier: 'verifier',
      waitForCallback,
      close,
    });

    await ensureLazyOAuthAuth(logger);
    expect(isLazyOAuthSessionReady()).toBe(true);
    expect(startSpy).toHaveBeenCalledTimes(1);

    await ensureLazyOAuthAuth(logger);
    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent login attempts', async () => {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';

    let resolveCallback: (() => void) | undefined;
    const waitForCallback = vi.fn(
      () =>
        new Promise<{ code: string; state: string }>((resolve) => {
          resolveCallback = () => resolve({ code: 'abc', state: 'xyz' });
        }),
    );
    const close = vi.fn().mockResolvedValue(undefined);
    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue({
      redirectUri: 'http://127.0.0.1:1/callback',
      clientId: 'client',
      codeVerifier: 'verifier',
      waitForCallback,
      close,
    });

    const first = ensureLazyOAuthAuth(logger);
    const second = ensureLazyOAuthAuth(logger);
    await vi.waitFor(() => expect(resolveCallback).toBeDefined());
    resolveCallback!();
    await Promise.all([first, second]);

    expect(startSpy).toHaveBeenCalledTimes(1);
  });
});

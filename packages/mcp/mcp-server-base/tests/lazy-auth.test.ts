import { McpToolErrorCode } from '@transcend-io/privacy-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimpleLogger } from '../src/clients/graphql/base.js';
import { ToolError } from '../src/errors.js';
import { resetOAuthClientState } from '../src/oauth/client-registry.js';
import { setResolvedOAuthIssuer, setResolvedTranscendApiUrl } from '../src/oauth/config.js';
import {
  OAUTH_CALLBACK_DENIED_AGENT_MESSAGE,
  OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE,
  formatOAuthLoginPendingNudgeMessage,
} from '../src/oauth/constants.js';
import {
  ensureLazyOAuthAuth,
  getLazyOAuthCredentials,
  getStoredAuthorizationGrant,
  isLazyOAuthSessionReady,
  resetLazyOAuthState,
} from '../src/oauth/lazy-auth.js';
import * as metadata from '../src/oauth/metadata.js';
import * as oauthFlow from '../src/oauth/oauth-flow.js';
import * as openBrowserModule from '../src/oauth/open-browser.js';
import { configureOAuthScopes, resetConfiguredOAuthScopes } from '../src/oauth/scopes.js';
import * as tokenExchange from '../src/oauth/token-exchange.js';
import * as tokenManager from '../src/oauth/token-manager.js';
import * as tokenRefresh from '../src/oauth/token-refresh.js';
import { storedTokensFromTokenResponse } from '../src/oauth/token-store.js';
import type { PendingOAuthSession } from '../src/oauth/types.js';

describe('ensureLazyOAuthAuth', () => {
  const logger = new SimpleLogger();
  const TEST_AUTHORIZATION_URL =
    'https://yo.com:4001/oauth/authorize?client_id=client-abc&response_type=code';
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
  const originalCredentialStore = process.env.TRANSCEND_MCP_CREDENTIAL_STORE;

  function enableLazyOAuthTestEnv(): void {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    process.env.TRANSCEND_MCP_CREDENTIAL_STORE = 'memory';
    setResolvedOAuthIssuer('https://yo.com:4001');
    setResolvedTranscendApiUrl('https://yo.com:4001');
    configureOAuthScopes(['ViewRequests', 'offline_access']);
  }

  function mockAuthorizationMetadataAndExchange(): void {
    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer: 'https://yo.com:4001',
      authorizationEndpoint: 'https://yo.com:4001/oauth/authorize',
      tokenEndpoint: 'https://yo.com:4001/oauth/token',
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenExchange, 'exchangeAuthorizationCode').mockResolvedValue(
      storedTokensFromTokenResponse({
        response: { access_token: 'access', expires_in: 3600 },
        issuer: 'https://yo.com:4001',
        clientId: 'client-abc',
      }),
    );
  }

  function createPendingOAuthSession(): {
    session: PendingOAuthSession;
    resolveCallback: () => void;
  } {
    let resolveCallback: (() => void) | undefined;
    const waitForCallback = vi.fn(
      () =>
        new Promise<{ code: string; state: string }>((resolve) => {
          resolveCallback = () => resolve({ code: 'abc', state: 'xyz' });
        }),
    );
    const close = vi.fn().mockResolvedValue(undefined);
    return {
      session: {
        authorizationUrl: TEST_AUTHORIZATION_URL,
        redirectUri: 'http://127.0.0.1:1/callback',
        clientId: 'client',
        codeVerifier: 'verifier',
        waitForCallback,
        close,
      },
      resolveCallback: () => resolveCallback!(),
    };
  }

  beforeEach(() => {
    resetLazyOAuthState();
    resetOAuthClientState();
    resetConfiguredOAuthScopes();
    vi.restoreAllMocks();
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    delete process.env.TRANSCEND_MCP_CREDENTIAL_STORE;
  });

  afterEach(() => {
    resetLazyOAuthState();
    resetOAuthClientState();
    resetConfiguredOAuthScopes();
    if (originalApiKey === undefined) delete process.env.TRANSCEND_API_KEY;
    else process.env.TRANSCEND_API_KEY = originalApiKey;

    if (originalIssuer === undefined) delete process.env.TRANSCEND_OAUTH_ISSUER;
    else process.env.TRANSCEND_OAUTH_ISSUER = originalIssuer;

    if (originalClientId === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    else process.env.TRANSCEND_OAUTH_CLIENT_ID = originalClientId;

    if (originalClientSecret === undefined) delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    else process.env.TRANSCEND_OAUTH_CLIENT_SECRET = originalClientSecret;

    if (originalRedirectPort === undefined) delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
    else process.env.TRANSCEND_OAUTH_REDIRECT_PORT = originalRedirectPort;

    if (originalCredentialStore === undefined) delete process.env.TRANSCEND_MCP_CREDENTIAL_STORE;
    else process.env.TRANSCEND_MCP_CREDENTIAL_STORE = originalCredentialStore;
  });

  it('no-ops when OAuth mode is disabled', async () => {
    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin');
    await ensureLazyOAuthAuth(logger);
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('refreshes expired tokens without opening the browser', async () => {
    enableLazyOAuthTestEnv();
    const now = 1_700_000_000_000;
    const expired = storedTokensFromTokenResponse({
      response: {
        access_token: 'expired-access',
        refresh_token: 'refresh-token',
        expires_in: 60,
      },
      issuer: 'https://yo.com:4001',
      clientId: 'client-abc',
      nowMs: now,
    });
    tokenManager.setActiveStoredOAuthTokens(expired);

    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer: 'https://yo.com:4001',
      authorizationEndpoint: 'https://yo.com:4001/oauth/authorize',
      tokenEndpoint: 'https://yo.com:4001/oauth/token',
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenRefresh, 'refreshOAuthTokens').mockResolvedValue(
      storedTokensFromTokenResponse({
        response: {
          access_token: 'refreshed-access',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        },
        issuer: 'https://yo.com:4001',
        clientId: 'client-abc',
        nowMs: expired.expiresAt + 1,
      }),
    );

    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin');
    await ensureLazyOAuthAuth(logger);

    expect(startSpy).not.toHaveBeenCalled();
    expect(isLazyOAuthSessionReady()).toBe(true);
    expect(getLazyOAuthCredentials()).toMatchObject({
      type: 'oauthToken',
      accessToken: 'refreshed-access',
    });
  });

  it('uses cached tokens without opening the browser', async () => {
    enableLazyOAuthTestEnv();
    const now = Date.now();
    tokenManager.setActiveStoredOAuthTokens(
      storedTokensFromTokenResponse({
        response: {
          access_token: 'cached-access',
          refresh_token: 'cached-refresh',
          expires_in: 3600,
        },
        issuer: 'https://yo.com:4001',
        clientId: 'client-abc',
        nowMs: now,
      }),
    );

    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin');
    await ensureLazyOAuthAuth(logger);

    expect(startSpy).not.toHaveBeenCalled();
    expect(isLazyOAuthSessionReady()).toBe(true);
    expect(getLazyOAuthCredentials()).toMatchObject({
      type: 'oauthToken',
      accessToken: 'cached-access',
      refreshToken: 'cached-refresh',
    });
  });

  it('runs OAuth login once, exchanges tokens, and marks the session ready', async () => {
    enableLazyOAuthTestEnv();

    const waitForCallback = vi.fn().mockResolvedValue({ code: 'abc', state: 'xyz' });
    const close = vi.fn().mockResolvedValue(undefined);
    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue({
      authorizationUrl: TEST_AUTHORIZATION_URL,
      redirectUri: 'http://127.0.0.1:1/callback',
      clientId: 'client',
      codeVerifier: 'verifier',
      waitForCallback,
      close,
    });
    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer: 'https://yo.com:4001',
      authorizationEndpoint: 'https://yo.com:4001/oauth/authorize',
      tokenEndpoint: 'https://yo.com:4001/oauth/token',
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenExchange, 'exchangeAuthorizationCode').mockResolvedValue(
      storedTokensFromTokenResponse({
        response: {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
        },
        issuer: 'https://yo.com:4001',
        clientId: 'client-abc',
      }),
    );

    await ensureLazyOAuthAuth(logger);
    expect(isLazyOAuthSessionReady()).toBe(true);
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(getStoredAuthorizationGrant()).toEqual({
      code: 'abc',
      state: 'xyz',
      codeVerifier: 'verifier',
      redirectUri: 'http://127.0.0.1:1/callback',
      clientId: 'client',
    });
    expect(getLazyOAuthCredentials()).toMatchObject({
      type: 'oauthToken',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await ensureLazyOAuthAuth(logger);
    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  it('surfaces OAuth callback timeouts as non-retryable AUTH_ERROR tool errors', async () => {
    enableLazyOAuthTestEnv();

    vi.spyOn(oauthFlow, 'startOAuthLogin').mockRejectedValue(new Error('OAuth callback timed out'));

    await expect(ensureLazyOAuthAuth(logger)).rejects.toMatchObject({
      name: 'ToolError',
      code: McpToolErrorCode.AuthError,
      message: OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE,
      retryable: false,
    } satisfies Partial<ToolError>);
    expect(isLazyOAuthSessionReady()).toBe(false);
    expect(getStoredAuthorizationGrant()).toBeNull();
    expect(getLazyOAuthCredentials()).toBeNull();
  });

  it('surfaces OAuth consent denial as non-retryable AUTH_ERROR tool errors', async () => {
    enableLazyOAuthTestEnv();

    vi.spyOn(oauthFlow, 'startOAuthLogin').mockRejectedValue(
      new Error('OAuth authorization failed: access_denied — User denied'),
    );

    await expect(ensureLazyOAuthAuth(logger)).rejects.toMatchObject({
      name: 'ToolError',
      code: McpToolErrorCode.AuthError,
      message: OAUTH_CALLBACK_DENIED_AGENT_MESSAGE,
      retryable: false,
    } satisfies Partial<ToolError>);
    expect(isLazyOAuthSessionReady()).toBe(false);
    expect(getStoredAuthorizationGrant()).toBeNull();
    expect(getLazyOAuthCredentials()).toBeNull();
  });

  it('surfaces non-timeout OAuth failures as non-retryable AUTH_ERROR tool errors', async () => {
    enableLazyOAuthTestEnv();

    vi.spyOn(oauthFlow, 'startOAuthLogin').mockRejectedValue(
      new Error('OAuth authorization failed'),
    );

    await expect(ensureLazyOAuthAuth(logger)).rejects.toMatchObject({
      name: 'ToolError',
      code: McpToolErrorCode.AuthError,
      message: 'OAuth authorization failed',
      retryable: false,
    } satisfies Partial<ToolError>);
  });

  it('deduplicates concurrent login attempts', async () => {
    enableLazyOAuthTestEnv();

    let resolveCallback: (() => void) | undefined;
    const waitForCallback = vi.fn(
      () =>
        new Promise<{ code: string; state: string }>((resolve) => {
          resolveCallback = () => resolve({ code: 'abc', state: 'xyz' });
        }),
    );
    const close = vi.fn().mockResolvedValue(undefined);
    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue({
      authorizationUrl: TEST_AUTHORIZATION_URL,
      redirectUri: 'http://127.0.0.1:1/callback',
      clientId: 'client',
      codeVerifier: 'verifier',
      waitForCallback,
      close,
    });
    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer: 'https://yo.com:4001',
      authorizationEndpoint: 'https://yo.com:4001/oauth/authorize',
      tokenEndpoint: 'https://yo.com:4001/oauth/token',
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenExchange, 'exchangeAuthorizationCode').mockResolvedValue(
      storedTokensFromTokenResponse({
        response: { access_token: 'access', expires_in: 3600 },
        issuer: 'https://yo.com:4001',
        clientId: 'client',
      }),
    );

    const first = ensureLazyOAuthAuth(logger);
    const second = ensureLazyOAuthAuth(logger);
    await vi.waitFor(() => expect(resolveCallback).toBeDefined());
    resolveCallback!();
    await Promise.all([first, second]);

    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  describe('late joiner nudges', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('nudges with URL after silent attach window without reopening the browser', async () => {
      vi.useFakeTimers();
      enableLazyOAuthTestEnv();
      mockAuthorizationMetadataAndExchange();

      const { session, resolveCallback } = createPendingOAuthSession();
      vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue(session);
      const openBrowserSpy = vi
        .spyOn(openBrowserModule, 'openBrowser')
        .mockResolvedValue(undefined);
      const warnSpy = vi.spyOn(logger, 'warn');

      const first = ensureLazyOAuthAuth(logger);
      await vi.waitFor(() => expect(session.waitForCallback).toHaveBeenCalled());

      vi.advanceTimersByTime(10_000);
      const second = ensureLazyOAuthAuth(logger);
      await vi.waitFor(() =>
        expect(warnSpy).toHaveBeenCalledWith(
          formatOAuthLoginPendingNudgeMessage(TEST_AUTHORIZATION_URL),
          { authorizationUrl: TEST_AUTHORIZATION_URL },
        ),
      );
      expect(openBrowserSpy).not.toHaveBeenCalled();

      resolveCallback();
      await Promise.all([first, second]);
      expect(isLazyOAuthSessionReady()).toBe(true);
    });

    it('reopens the browser and nudges after the reopen threshold', async () => {
      vi.useFakeTimers();
      enableLazyOAuthTestEnv();
      mockAuthorizationMetadataAndExchange();

      const { session, resolveCallback } = createPendingOAuthSession();
      vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue(session);
      const openBrowserSpy = vi
        .spyOn(openBrowserModule, 'openBrowser')
        .mockResolvedValue(undefined);
      const warnSpy = vi.spyOn(logger, 'warn');

      const first = ensureLazyOAuthAuth(logger);
      await vi.waitFor(() => expect(session.waitForCallback).toHaveBeenCalled());

      vi.advanceTimersByTime(65_000);
      const second = ensureLazyOAuthAuth(logger);
      await vi.waitFor(() =>
        expect(openBrowserSpy).toHaveBeenCalledWith(TEST_AUTHORIZATION_URL, logger),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        formatOAuthLoginPendingNudgeMessage(TEST_AUTHORIZATION_URL),
        { authorizationUrl: TEST_AUTHORIZATION_URL },
      );

      resolveCallback();
      await Promise.all([first, second]);
      expect(isLazyOAuthSessionReady()).toBe(true);
    });

    it('silently attaches when authorizationUrl is not yet available', async () => {
      vi.useFakeTimers();
      enableLazyOAuthTestEnv();
      mockAuthorizationMetadataAndExchange();

      const { session, resolveCallback } = createPendingOAuthSession();
      let resolveStartOAuthLogin: ((value: PendingOAuthSession) => void) | undefined;
      const startOAuthLoginPromise = new Promise<PendingOAuthSession>((resolve) => {
        resolveStartOAuthLogin = resolve;
      });
      vi.spyOn(oauthFlow, 'startOAuthLogin').mockReturnValue(startOAuthLoginPromise);
      const warnSpy = vi.spyOn(logger, 'warn');

      const first = ensureLazyOAuthAuth(logger);
      vi.advanceTimersByTime(10_000);
      const second = ensureLazyOAuthAuth(logger);

      expect(warnSpy).not.toHaveBeenCalled();

      resolveStartOAuthLogin!(session);
      await vi.waitFor(() => expect(session.waitForCallback).toHaveBeenCalled());
      resolveCallback();
      await Promise.all([first, second]);
    });

    it('deduplicates URL nudges for multiple late joiners in the same open window', async () => {
      vi.useFakeTimers();
      enableLazyOAuthTestEnv();
      mockAuthorizationMetadataAndExchange();

      const { session, resolveCallback } = createPendingOAuthSession();
      vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue(session);
      const warnSpy = vi.spyOn(logger, 'warn');

      const first = ensureLazyOAuthAuth(logger);
      await vi.waitFor(() => expect(session.waitForCallback).toHaveBeenCalled());

      vi.advanceTimersByTime(10_000);
      const second = ensureLazyOAuthAuth(logger);
      vi.advanceTimersByTime(5_000);
      const third = ensureLazyOAuthAuth(logger);

      await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledTimes(1));

      resolveCallback();
      await Promise.all([first, second, third]);
    });
  });
});

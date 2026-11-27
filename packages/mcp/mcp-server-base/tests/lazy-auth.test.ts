import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import { McpToolErrorCode } from '@transcend-io/privacy-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HUMAN_RESPONSE_FLOOR_MS } from '../src/capabilities/cursor-decline-quirk.js';
import { McpClientCapability, McpHostClient } from '../src/capabilities/types.js';
import { SimpleLogger } from '../src/clients/graphql/base.js';
import { ToolError } from '../src/errors.js';
import {
  mcpSessionContext,
  NO_ELICITATION_FIELDS,
  type McpSession,
  type requestElicitation,
  type requestUrlElicitation,
} from '../src/mcp-session-context.js';
import { resetOAuthClientState } from '../src/oauth/client-registry.js';
import { setResolvedOAuthIssuer, setResolvedTranscendApiUrl } from '../src/oauth/config.js';
import {
  OAUTH_CALLBACK_DENIED_AGENT_MESSAGE,
  OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE,
  OAUTH_SIGN_IN_ABANDONED_AGENT_MESSAGE,
  OAUTH_SIGN_IN_DECLINE_COOLDOWN_MS,
  OAUTH_SIGN_IN_DECLINED_AGENT_MESSAGE,
  OAUTH_SIGN_IN_ELSEWHERE_AGENT_MESSAGE,
  OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS,
  formatOAuthSignInLinkMessage,
  formatOAuthSignInPrompt,
} from '../src/oauth/constants.js';
import { createMemoryCredentialStore } from '../src/oauth/credential-store/memory-store.js';
import type { CredentialStore } from '../src/oauth/credential-store/types.js';
import {
  createLazyOAuth,
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
import { toolCallContext } from '../src/tool-call-context.js';
import { createFakeAuthorizationServer } from './helpers/fake-authorization-server.js';

describe('ensureLazyOAuthAuth', () => {
  const logger = new SimpleLogger();
  const TEST_AUTHORIZATION_URL =
    'https://yo.com:4001/oauth/authorize?client_id=client-abc&response_type=code';
  const originalApiKey = process.env.TRANSCEND_API_KEY;
  const originalIssuer = process.env.TRANSCEND_OAUTH_ISSUER;
  const originalClientId = process.env.TRANSCEND_OAUTH_CLIENT_ID;
  const originalClientSecret = process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
  const originalRedirectPort = process.env.TRANSCEND_OAUTH_REDIRECT_PORT;

  function enableLazyOAuthTestEnv(): void {
    process.env.TRANSCEND_OAUTH_ISSUER = 'https://yo.com:4001';
    process.env.TRANSCEND_OAUTH_CLIENT_ID = 'client-abc';
    process.env.TRANSCEND_OAUTH_CLIENT_SECRET = 'secret';
    process.env.TRANSCEND_OAUTH_REDIRECT_PORT = '4567';
    setResolvedOAuthIssuer('https://yo.com:4001');
    setResolvedTranscendApiUrl('https://yo.com:4001');
    configureOAuthScopes(['ViewRequests']);
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
        clientId: 'client-abc',
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
    vi.restoreAllMocks();
    delete process.env.TRANSCEND_API_KEY;
    delete process.env.TRANSCEND_OAUTH_ISSUER;
    delete process.env.TRANSCEND_OAUTH_CLIENT_ID;
    delete process.env.TRANSCEND_OAUTH_CLIENT_SECRET;
    delete process.env.TRANSCEND_OAUTH_REDIRECT_PORT;
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

  it('returns a sign-in link and opens no browser when no host can be asked', async () => {
    enableLazyOAuthTestEnv();
    mockAuthorizationMetadataAndExchange();
    const { session, resolveCallback } = createPendingOAuthSession();
    const startSpy = vi.spyOn(oauthFlow, 'startOAuthLogin').mockResolvedValue(session);
    const openBrowserSpy = vi.spyOn(openBrowserModule, 'openBrowser');

    await expect(ensureLazyOAuthAuth(logger)).rejects.toMatchObject({
      name: 'ToolError',
      code: McpToolErrorCode.AuthError,
      message: formatOAuthSignInLinkMessage(TEST_AUTHORIZATION_URL),
      retryable: false,
    } satisfies Partial<ToolError>);
    expect(openBrowserSpy).not.toHaveBeenCalled();
    expect(isLazyOAuthSessionReady()).toBe(false);

    resolveCallback();
    await vi.waitFor(() => expect(isLazyOAuthSessionReady()).toBe(true));
    await ensureLazyOAuthAuth(logger);

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(getStoredAuthorizationGrant()).toEqual({
      code: 'abc',
      state: 'xyz',
      codeVerifier: 'verifier',
      redirectUri: 'http://127.0.0.1:1/callback',
      clientId: 'client-abc',
    });
    expect(getLazyOAuthCredentials()).toMatchObject({ type: 'oauthToken', accessToken: 'access' });
  });
});

describe('createLazyOAuth', () => {
  const logger = new SimpleLogger();
  const client: tokenManager.OAuthClientCredentials = {
    issuer: 'https://issuer.example',
    clientId: 'client-abc',
    clientSecret: 'secret',
    scopes: ['ViewRequests', 'offline_access'],
  };
  const TOOL_NAME = 'dsr_list_requests';
  /** Longer than any host takes to refuse a prompt it never showed. */
  const HUMAN_SPEED_MS = HUMAN_RESPONSE_FLOOR_MS * 8;

  /** One sign-in prompt the fake host is showing. */
  interface OpenPrompt {
    /** Text the host shows */
    message: string;
    /** Answers the prompt as the user */
    answer: (action: ElicitResult['action']) => void;
    /** Fails the prompt as a host that could not show it */
    fail: (error: Error) => void;
  }

  /** One login the fake callback server is waiting on. */
  interface StartedLogin {
    /** Consent URL of this login */
    authorizationUrl: string;
    /** Delivers the browser redirect */
    completeInBrowser: () => void;
    /** Ends the wait the way the callback server does */
    failCallback: (error: Error) => void;
    /** Spy on the callback server shutdown */
    close: ReturnType<typeof vi.fn>;
  }

  /**
   * One MCP process with no saved login: a fake host that shows prompts, a fake
   * browser, and a fake callback server per login.
   */
  function startProcess(
    options: {
      /** Whether the host can show a prompt */
      canPrompt?: boolean;
      /** Credential store, to share one between processes */
      store?: CredentialStore;
      /** How a host that declares URL-mode elicitation answers; absent when it does not */
      urlAnswer?: ElicitResult['action'];
    } = {},
  ) {
    const server = createFakeAuthorizationServer(client);
    const store = options.store ?? createMemoryCredentialStore();
    const clock = { nowMs: 1_700_000_000_000 };
    const prompts: OpenPrompt[] = [];
    const logins: StartedLogin[] = [];
    const openBrowser = vi.fn().mockResolvedValue(undefined);
    const elicit = vi.fn<typeof requestElicitation>(async (message) => {
      if (options.canPrompt === false) return undefined;
      return new Promise<ElicitResult>((resolve, reject) => {
        prompts.push({ message, answer: (action) => resolve({ action }), fail: reject });
      });
    });

    const elicitUrl = vi.fn<typeof requestUrlElicitation>(async () => ({
      action: options.urlAnswer ?? 'cancel',
    }));

    const startLoginSpy = vi.spyOn(oauthFlow, 'startOAuthLogin').mockImplementation(async () => {
      const authorizationUrl = `${client.issuer}/oauth/authorize?login=${logins.length + 1}`;
      let completeInBrowser!: () => void;
      let failCallback!: (error: Error) => void;
      const callback = new Promise<{ code: string; state: string }>((resolve, reject) => {
        completeInBrowser = () => resolve({ code: 'abc', state: 'xyz' });
        failCallback = reject;
      });
      const close = vi.fn().mockResolvedValue(undefined);
      logins.push({ authorizationUrl, completeInBrowser, failCallback, close });
      return {
        authorizationUrl,
        redirectUri: 'http://127.0.0.1:1/callback',
        clientId: client.clientId,
        codeVerifier: 'verifier',
        waitForCallback: () => callback,
        close,
      };
    });
    vi.spyOn(metadata, 'fetchAuthorizationServerMetadata').mockResolvedValue({
      issuer: client.issuer,
      authorizationEndpoint: `${client.issuer}/oauth/authorize`,
      tokenEndpoint: `${client.issuer}/oauth/token`,
      codeChallengeMethodsSupported: ['S256'],
    });
    vi.spyOn(tokenExchange, 'exchangeAuthorizationCode').mockImplementation(async () =>
      server.signIn(clock.nowMs),
    );

    const manager = tokenManager.createOAuthTokenManager({
      store,
      now: () => clock.nowMs,
      fetch: server.fetch,
    });
    const lazyOAuth = createLazyOAuth({
      tokenManager: manager,
      openBrowser,
      elicit,
      elicitUrl,
      resolveClient: () => client,
      now: () => clock.nowMs,
    });

    /** Runs the auth step of one tool call, as the server does. */
    const callTool = (
      call: {
        /** Host the call comes from */
        host?: McpHostClient;
        /** Aborts when the caller cancels or times out */
        signal?: AbortSignal;
      } = {},
    ): Promise<void> => {
      const session: McpSession = {
        client: {
          capabilities: new Set([
            McpClientCapability.Elicitation,
            ...(options.urlAnswer ? [McpClientCapability.ElicitationUrl] : []),
          ]),
          host: call.host ?? McpHostClient.Claude,
        },
        server: {} as Server,
        request: { id: 1, signal: call.signal ?? new AbortController().signal },
      };
      return mcpSessionContext.run(session, () =>
        toolCallContext.run({ toolName: TOOL_NAME, correlationId: 'correlation' }, () =>
          lazyOAuth.ensureAuth(logger),
        ),
      );
    };

    return {
      lazyOAuth,
      callTool,
      clock,
      prompts,
      logins,
      elicit,
      elicitUrl,
      openBrowser,
      startLoginSpy,
      server,
      manager,
    };
  }

  const declined = {
    name: 'ToolError',
    code: McpToolErrorCode.AuthError,
    message: OAUTH_SIGN_IN_DECLINED_AGENT_MESSAGE,
    retryable: false,
  } satisfies Partial<ToolError>;

  const abandoned = {
    code: McpToolErrorCode.AuthError,
    message: OAUTH_SIGN_IN_ABANDONED_AGENT_MESSAGE,
  } satisfies Partial<ToolError>;

  function signInLink(authorizationUrl: string): Partial<ToolError> {
    return {
      name: 'ToolError',
      code: McpToolErrorCode.AuthError,
      message: formatOAuthSignInLinkMessage(authorizationUrl),
      retryable: false,
    };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('with a host that can show a prompt', () => {
    it('opens no browser until the user accepts the prompt', async () => {
      const { callTool, prompts, logins, elicit, openBrowser, lazyOAuth } = startProcess();

      const call = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(1));

      expect(elicit).toHaveBeenCalledWith(
        `Sign in to Transcend (${new URL(client.issuer).host}) to run ${TOOL_NAME}. ` +
          'Accept opens your browser.',
        NO_ELICITATION_FIELDS,
        { timeout: OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS },
      );
      expect(prompts[0]!.message).toBe(
        formatOAuthSignInPrompt(new URL(client.issuer).host, TOOL_NAME),
      );
      expect(openBrowser).not.toHaveBeenCalled();
      expect(logins).toHaveLength(0);

      prompts[0]!.answer('accept');
      await vi.waitFor(() => expect(openBrowser).toHaveBeenCalledTimes(1));
      expect(openBrowser).toHaveBeenCalledWith(logins[0]!.authorizationUrl, logger);

      logins[0]!.completeInBrowser();
      await call;

      expect(lazyOAuth.isSessionReady()).toBe(true);
      expect(lazyOAuth.getCredentials()).toMatchObject({ accessToken: 'access-1' });
      expect(logins[0]!.close).toHaveBeenCalledTimes(1);
    });

    it.each(['decline', 'cancel'] as const)(
      'fails the call and opens no browser when the user answers %s',
      async (action) => {
        const { callTool, prompts, logins, openBrowser, clock } = startProcess();

        const call = callTool();
        await vi.waitFor(() => expect(prompts).toHaveLength(1));
        clock.nowMs += HUMAN_SPEED_MS;
        prompts[0]!.answer(action);

        await expect(call).rejects.toMatchObject(declined);
        expect(openBrowser).not.toHaveBeenCalled();
        expect(logins).toHaveLength(0);
      },
    );

    it('shows one prompt and one browser window for parallel calls, and all succeed', async () => {
      const { callTool, prompts, logins, elicit, openBrowser } = startProcess();

      const calls = [callTool(), callTool(), callTool()];
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      prompts[0]!.answer('accept');
      await vi.waitFor(() => expect(openBrowser).toHaveBeenCalledTimes(1));

      // A call that arrives while the browser is open waits too.
      calls.push(callTool());
      logins[0]!.completeInBrowser();
      await Promise.all(calls);

      expect(elicit).toHaveBeenCalledTimes(1);
      expect(openBrowser).toHaveBeenCalledTimes(1);
      expect(logins).toHaveLength(1);
    });

    it('fails every waiting call when the user declines the one prompt', async () => {
      const { callTool, prompts, elicit, clock } = startProcess();

      const calls = [callTool(), callTool()];
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      clock.nowMs += HUMAN_SPEED_MS;
      prompts[0]!.answer('decline');

      const outcomes = await Promise.allSettled(calls);
      expect(outcomes.map((outcome) => outcome.status)).toEqual(['rejected', 'rejected']);
      await expect(calls[1]).rejects.toMatchObject(declined);
      expect(elicit).toHaveBeenCalledTimes(1);
    });

    it('fails calls with the declined error for 60 seconds after a decline and starts no login, then asks again', async () => {
      const { callTool, prompts, logins, elicit, openBrowser, clock } = startProcess();

      const first = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      clock.nowMs += HUMAN_SPEED_MS;
      prompts[0]!.answer('decline');
      await expect(first).rejects.toMatchObject(declined);

      clock.nowMs += OAUTH_SIGN_IN_DECLINE_COOLDOWN_MS - 1;
      await expect(callTool()).rejects.toMatchObject(declined);
      await expect(callTool()).rejects.toMatchObject(declined);
      expect(elicit).toHaveBeenCalledTimes(1);
      expect(openBrowser).not.toHaveBeenCalled();
      expect(logins).toHaveLength(0);

      clock.nowMs += 1;
      const afterCooldown = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(2));
      prompts[1]!.answer('accept');
      await vi.waitFor(() => expect(openBrowser).toHaveBeenCalledTimes(1));

      expect(openBrowser).toHaveBeenCalledWith(logins[0]!.authorizationUrl, logger);
      logins[0]!.completeInBrowser();
      await afterCooldown;
    });

    it('stops a waiting call when its request is cancelled, and the sign-in still completes', async () => {
      const { callTool, prompts, logins, elicit } = startProcess();
      const cancelled = new AbortController();

      const asker = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      const joiner = callTool({ signal: cancelled.signal });
      cancelled.abort();
      await expect(joiner).rejects.toMatchObject(abandoned);

      prompts[0]!.answer('accept');
      await vi.waitFor(() => expect(logins).toHaveLength(1));
      logins[0]!.completeInBrowser();
      await asker;
      expect(elicit).toHaveBeenCalledTimes(1);
    });

    it('starts no login when the asking call is cancelled, and the next call asks again', async () => {
      const { callTool, prompts, logins, elicit } = startProcess();
      const cancelled = new AbortController();

      const call = callTool({ signal: cancelled.signal });
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      cancelled.abort();
      // The SDK rejects the open elicitation when its request is aborted.
      prompts[0]!.fail(new Error('This operation was aborted'));

      await expect(call).rejects.toMatchObject(abandoned);
      expect(logins).toHaveLength(0);

      const next = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(2));
      expect(elicit).toHaveBeenCalledTimes(2);
      prompts[1]!.answer('accept');
      await vi.waitFor(() => expect(logins).toHaveLength(1));
      logins[0]!.completeInBrowser();
      await next;
    });

    it('finishes the sign-in in the background when the accepting call times out', async () => {
      const { callTool, prompts, logins, elicit, openBrowser, lazyOAuth } = startProcess();
      const hostTimeout = new AbortController();

      const call = callTool({ signal: hostTimeout.signal });
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      prompts[0]!.answer('accept');
      await vi.waitFor(() => expect(openBrowser).toHaveBeenCalledTimes(1));
      hostTimeout.abort();
      await expect(call).rejects.toMatchObject(abandoned);
      expect(logins[0]!.close).not.toHaveBeenCalled();

      logins[0]!.completeInBrowser();
      await vi.waitFor(() => expect(lazyOAuth.isSessionReady()).toBe(true));
      await callTool();

      expect(elicit).toHaveBeenCalledTimes(1);
      expect(openBrowser).toHaveBeenCalledTimes(1);
    });

    it('ends a sign-in that timed out, and the next call asks again', async () => {
      const { callTool, prompts, logins, elicit, openBrowser } = startProcess();

      const call = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      prompts[0]!.answer('accept');
      await vi.waitFor(() => expect(openBrowser).toHaveBeenCalledTimes(1));
      logins[0]!.failCallback(new Error('OAuth callback timed out after 300000ms'));

      await expect(call).rejects.toMatchObject({
        code: McpToolErrorCode.AuthError,
        message: OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE,
        retryable: false,
      } satisfies Partial<ToolError>);
      expect(logins[0]!.close).toHaveBeenCalledTimes(1);

      const next = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(2));
      expect(elicit).toHaveBeenCalledTimes(2);
      expect(openBrowser).toHaveBeenCalledTimes(1);
      prompts[1]!.answer('accept');
      await vi.waitFor(() => expect(logins).toHaveLength(2));
      logins[1]!.completeInBrowser();
      await next;
    });

    it.each([
      {
        failure: 'OAuth authorization failed: access_denied — User denied',
        message: OAUTH_CALLBACK_DENIED_AGENT_MESSAGE,
      },
      { failure: 'OAuth authorization failed', message: 'OAuth authorization failed' },
    ])('reports "$failure" from the browser as a non-retryable AuthError', async (testCase) => {
      const { callTool, prompts, logins, lazyOAuth } = startProcess();

      const call = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      prompts[0]!.answer('accept');
      await vi.waitFor(() => expect(logins).toHaveLength(1));
      logins[0]!.failCallback(new Error(testCase.failure));

      await expect(call).rejects.toMatchObject({
        name: 'ToolError',
        code: McpToolErrorCode.AuthError,
        message: testCase.message,
        retryable: false,
      } satisfies Partial<ToolError>);
      expect(lazyOAuth.isSessionReady()).toBe(false);
      expect(lazyOAuth.getAuthorizationGrant()).toBeNull();
      expect(lazyOAuth.getCredentials()).toBeNull();
    });

    it('says a sign-in is open in another window when the callback port is taken', async () => {
      const store = createMemoryCredentialStore();
      const { callTool, prompts, elicit, openBrowser, startLoginSpy, server, clock } = startProcess(
        { store },
      );
      startLoginSpy.mockRejectedValue(
        Object.assign(new Error('listen EADDRINUSE: address already in use 127.0.0.1:4567'), {
          code: 'EADDRINUSE',
        }),
      );

      const call = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      prompts[0]!.answer('accept');

      await expect(call).rejects.toMatchObject({
        code: McpToolErrorCode.AuthError,
        message: OAUTH_SIGN_IN_ELSEWHERE_AGENT_MESSAGE,
        retryable: false,
      } satisfies Partial<ToolError>);
      expect(openBrowser).not.toHaveBeenCalled();

      // The other window finishes its sign-in and saves the login.
      const otherWindow = tokenManager.createOAuthTokenManager({ store, fetch: server.fetch });
      await otherWindow.saveTokens(client, server.signIn(clock.nowMs), logger);

      await callTool();
      expect(elicit).toHaveBeenCalledTimes(1);
      expect(openBrowser).not.toHaveBeenCalled();
    });
  });

  describe('when the host can open a link but not show a form', () => {
    it('asks the host to open the consent link, and the sign-in completes without the agent', async () => {
      const { callTool, logins, elicitUrl, openBrowser } = startProcess({
        canPrompt: false,
        urlAnswer: 'accept',
      });

      const call = callTool();
      await vi.waitFor(() => expect(logins).toHaveLength(1));
      logins[0]!.completeInBrowser();
      await call;

      expect(elicitUrl).toHaveBeenCalledTimes(1);
      expect(elicitUrl).toHaveBeenCalledWith(
        formatOAuthSignInPrompt(new URL(client.issuer).host, TOOL_NAME),
        logins[0]!.authorizationUrl,
        { timeout: OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS },
      );
      expect(openBrowser).not.toHaveBeenCalled();
    });

    it('treats a refused link as a decline, closes the login, and holds the cooldown', async () => {
      const { callTool, logins, elicitUrl } = startProcess({
        canPrompt: false,
        urlAnswer: 'decline',
      });

      await expect(callTool()).rejects.toMatchObject(declined);
      expect(logins[0]!.close).toHaveBeenCalledTimes(1);

      await expect(callTool()).rejects.toMatchObject(declined);
      expect(elicitUrl).toHaveBeenCalledTimes(1);
      expect(logins).toHaveLength(1);
    });
  });

  describe('when nobody can be asked', () => {
    it('names the host the link goes to', async () => {
      const { callTool } = startProcess({ canPrompt: false });

      await expect(callTool()).rejects.toMatchObject({
        message: expect.stringContaining(`It goes to ${new URL(client.issuer).host}.`),
      });
    });
    it('returns a sign-in link, keeps the callback server open, and the retry succeeds', async () => {
      const { callTool, logins, openBrowser, lazyOAuth } = startProcess({ canPrompt: false });

      await expect(callTool()).rejects.toMatchObject(
        signInLink(`${client.issuer}/oauth/authorize?login=1`),
      );
      expect(formatOAuthSignInLinkMessage(logins[0]!.authorizationUrl)).toContain(
        `[Sign in to Transcend](${logins[0]!.authorizationUrl})`,
      );
      expect(logins[0]!.close).not.toHaveBeenCalled();

      // A call before the user signed in gets the same link, not a second login.
      await expect(callTool()).rejects.toMatchObject(signInLink(logins[0]!.authorizationUrl));
      expect(logins).toHaveLength(1);

      logins[0]!.completeInBrowser();
      await vi.waitFor(() => expect(lazyOAuth.isSessionReady()).toBe(true));
      await callTool();

      expect(openBrowser).not.toHaveBeenCalled();
      expect(lazyOAuth.getCredentials()).toMatchObject({ accessToken: 'access-1' });
    });

    it('returns the link when the host fails to show the prompt', async () => {
      const { callTool, prompts, logins, openBrowser } = startProcess();

      const call = callTool();
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      prompts[0]!.fail(new Error('MCP error -32603: elicitation failed'));

      await expect(call).rejects.toMatchObject(
        signInLink(`${client.issuer}/oauth/authorize?login=1`),
      );
      expect(logins[0]!.close).not.toHaveBeenCalled();
      expect(openBrowser).not.toHaveBeenCalled();
    });

    it('returns the link when Cursor declines faster than a person could', async () => {
      const { callTool, prompts, logins, elicit, openBrowser } = startProcess();

      const call = callTool({ host: McpHostClient.Cursor });
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      prompts[0]!.answer('decline');

      await expect(call).rejects.toMatchObject(
        signInLink(`${client.issuer}/oauth/authorize?login=1`),
      );
      expect(logins[0]!.close).not.toHaveBeenCalled();
      expect(openBrowser).not.toHaveBeenCalled();

      // Nobody declined, so there is no cooldown: the next call may ask again.
      const next = callTool({ host: McpHostClient.Cursor });
      await vi.waitFor(() => expect(prompts).toHaveLength(2));
      expect(elicit).toHaveBeenCalledTimes(2);
      prompts[1]!.answer('accept');
      await vi.waitFor(() => expect(logins).toHaveLength(2));
      logins[1]!.completeInBrowser();
      await next;
    });

    it('treats a decline at human speed on Cursor as a decline', async () => {
      const { callTool, prompts, logins, clock } = startProcess();

      const call = callTool({ host: McpHostClient.Cursor });
      await vi.waitFor(() => expect(prompts).toHaveLength(1));
      clock.nowMs += HUMAN_RESPONSE_FLOOR_MS;
      prompts[0]!.answer('decline');

      await expect(call).rejects.toMatchObject(declined);
      expect(logins).toHaveLength(0);
    });

    it('ends a link sign-in that timed out, and the next call gets a new link', async () => {
      const { callTool, logins } = startProcess({ canPrompt: false });

      await expect(callTool()).rejects.toMatchObject(
        signInLink(`${client.issuer}/oauth/authorize?login=1`),
      );
      logins[0]!.failCallback(new Error('OAuth callback timed out after 300000ms'));
      await vi.waitFor(() => expect(logins[0]!.close).toHaveBeenCalledTimes(1));

      await expect(callTool()).rejects.toMatchObject(
        signInLink(`${client.issuer}/oauth/authorize?login=2`),
      );
    });
  });

  it('saves the login after sign-in, so a restarted process needs no prompt and no browser', async () => {
    const store = createMemoryCredentialStore();
    const first = startProcess({ store });

    const call = first.callTool();
    await vi.waitFor(() => expect(first.prompts).toHaveLength(1));
    first.prompts[0]!.answer('accept');
    await vi.waitFor(() => expect(first.logins).toHaveLength(1));
    first.logins[0]!.completeInBrowser();
    await call;

    const restarted = startProcess({ store });
    await restarted.callTool();

    expect(restarted.elicit).not.toHaveBeenCalled();
    expect(restarted.openBrowser).not.toHaveBeenCalled();
    expect(restarted.logins).toHaveLength(0);
    expect(restarted.lazyOAuth.isSessionReady()).toBe(true);
    expect(restarted.lazyOAuth.getCredentials()).toMatchObject({ accessToken: 'access-1' });
  });

  it('does not start a sign-in when a refresh fails for a passing reason', async () => {
    const { callTool, manager, server, clock, elicit, startLoginSpy, lazyOAuth } = startProcess();
    await manager.saveTokens(client, server.signIn(clock.nowMs), logger);
    clock.nowMs += 3_600_000;
    server.failNextRefresh(() => new Response('', { status: 503 }));

    await expect(callTool()).rejects.toMatchObject({
      code: McpToolErrorCode.ApiError,
      retryable: true,
    } satisfies Partial<ToolError>);
    expect(elicit).not.toHaveBeenCalled();
    expect(startLoginSpy).not.toHaveBeenCalled();

    await callTool();
    expect(lazyOAuth.getCredentials()).toMatchObject({ accessToken: 'access-2' });
    expect(elicit).not.toHaveBeenCalled();
  });
});

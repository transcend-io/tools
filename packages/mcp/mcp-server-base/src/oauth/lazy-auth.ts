import { McpToolErrorCode } from '@transcend-io/privacy-types';

import { getRequestAuth } from '../auth-context.js';
import type { OAuthTokenAuth } from '../auth.js';
import { McpClientCapability } from '../capabilities/types.js';
import type { Logger } from '../clients/graphql/base.js';
import { ToolError } from '../errors.js';
import {
  getMcpSession,
  hasCapability,
  requestElicitation,
  requestUrlElicitation,
} from '../mcp-session-context.js';
import { toolCallContext } from '../tool-call-context.js';
import { withProgressHeartbeat } from '../tools/confirmation/progress-heartbeat.js';
import {
  getOAuthClientIdFromEnv,
  getOAuthClientSecret,
  getOAuthIssuer,
  isOAuthModeEnabled,
} from './config.js';
import {
  formatOAuthSignInLinkMessage,
  formatOAuthSignInPrompt,
  OAUTH_CALLBACK_DENIED_AGENT_MESSAGE,
  OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE,
  OAUTH_SIGN_IN_DECLINE_COOLDOWN_MS,
  OAUTH_SIGN_IN_DECLINED_AGENT_MESSAGE,
  OAUTH_SIGN_IN_ELSEWHERE_AGENT_MESSAGE,
  OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS,
} from './constants.js';
import { isErrnoException } from './credential-store/config-directory.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { startOAuthLogin, waitForAuthorizationGrant } from './oauth-flow.js';
import { openBrowser } from './open-browser.js';
import {
  requestSignIn,
  SignInAnswer,
  throwIfRequestAbandoned,
  waitUnlessRequestAbandoned,
} from './request-sign-in.js';
import { getOAuthScopes } from './scopes.js';
import { exchangeAuthorizationCode } from './token-exchange.js';
import {
  defaultOAuthTokenManager,
  type OAuthClientCredentials,
  type OAuthTokenManager,
} from './token-manager.js';
import type { OAuthAuthorizationGrant, PendingOAuthSession } from './types.js';

/** A login whose callback server is listening for the browser redirect. */
interface PendingLogin {
  /** Consent URL that redirects to this login's callback server */
  authorizationUrl: string;
  /** Settles when the login is saved or has failed */
  completion: Promise<void>;
  /**
   * Whether calls wait for this login instead of handing out its link: the user
   * accepted the prompt, or the browser redirect already arrived.
   */
  isUnderway: boolean;
  /** Stops the callback server */
  close: () => Promise<void>;
}

export interface LazyOAuthOptions {
  /** Holds, saves, and refreshes the login */
  tokenManager: OAuthTokenManager;
  /** Opens the consent URL; defaults to the system browser */
  openBrowser?: typeof openBrowser;
  /** Shows the sign-in prompt in the host; defaults to MCP elicitation */
  elicit?: typeof requestElicitation;
  /** Asks the host to open the consent link; defaults to MCP URL-mode elicitation */
  elicitUrl?: typeof requestUrlElicitation;
  /** OAuth client for this process, or `null` when OAuth mode is off; defaults to the environment */
  resolveClient?: () => OAuthClientCredentials | null;
  /** Clock; defaults to `Date.now` */
  now?: () => number;
}

/** Signs the user in on the first tool call that needs it, and keeps them signed in. */
export interface LazyOAuth {
  /**
   * Ensures OAuth tokens are available before a tool call when stdio OAuth mode
   * is active. Uses the saved login and refreshes expired tokens when possible.
   * Otherwise asks the user to sign in, and opens the browser only after they
   * accept. Throws a sign-in link for the agent to show when the host cannot ask.
   */
  ensureAuth: (logger: Logger) => Promise<void>;
  /** Credentials after login, a saved login, or a refresh */
  getCredentials: () => OAuthTokenAuth | null;
  /** Authorization grant from the latest successful login */
  getAuthorizationGrant: () => OAuthAuthorizationGrant | null;
  /** Whether OAuth tokens are available in this process */
  isSessionReady: () => boolean;
  /** Forgets the session and the tokens held in this process (for tests) */
  reset: () => void;
}

function resolveOAuthClientFromEnv(): OAuthClientCredentials | null {
  if (!isOAuthModeEnabled()) return null;
  return {
    issuer: getOAuthIssuer(),
    clientId: getOAuthClientIdFromEnv()!,
    clientSecret: getOAuthClientSecret()!,
    scopes: getOAuthScopes(),
  };
}

function toSignInError(error: unknown): ToolError {
  if (error instanceof ToolError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (isErrnoException(error, 'EADDRINUSE')) {
    return new ToolError(McpToolErrorCode.AuthError, OAUTH_SIGN_IN_ELSEWHERE_AGENT_MESSAGE, false);
  }
  if (/timed out/i.test(message)) {
    return new ToolError(McpToolErrorCode.AuthError, OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE, false);
  }
  if (/access_denied/i.test(message)) {
    return new ToolError(McpToolErrorCode.AuthError, OAUTH_CALLBACK_DENIED_AGENT_MESSAGE, false);
  }
  return new ToolError(McpToolErrorCode.AuthError, message, false);
}

/**
 * Creates the lazy sign-in flow over a token manager.
 */
export function createLazyOAuth(options: LazyOAuthOptions): LazyOAuth {
  const { tokenManager } = options;
  const now = options.now ?? (() => Date.now());
  const resolveClient = options.resolveClient ?? resolveOAuthClientFromEnv;
  // Resolved per call, so a test that replaces the module export is honored.
  const open: typeof openBrowser = (url, logger) =>
    (options.openBrowser ?? openBrowser)(url, logger);
  const elicit = options.elicit ?? requestElicitation;
  const elicitUrl = options.elicitUrl ?? requestUrlElicitation;

  let sessionReady = false;
  let authorizationGrant: OAuthAuthorizationGrant | null = null;
  let pendingLogin: Promise<PendingLogin> | null = null;
  let openPrompt: Promise<PendingLogin | null> | null = null;
  let declinedAt: number | null = null;

  const currentLogin = async (): Promise<PendingLogin | null> =>
    (await pendingLogin?.catch(() => null)) ?? null;

  const completeLogin = async (
    login: PendingLogin,
    session: PendingOAuthSession,
    client: OAuthClientCredentials,
    logger: Logger,
  ): Promise<void> => {
    try {
      const grant = await waitForAuthorizationGrant(session);
      login.isUnderway = true;

      const metadata = await fetchAuthorizationServerMetadata(client.issuer);
      const tokens = await exchangeAuthorizationCode({
        tokenEndpoint: metadata.tokenEndpoint,
        grant,
        issuer: client.issuer,
        clientSecret: client.clientSecret,
      });
      await tokenManager.saveTokens(client, tokens, logger);
      authorizationGrant = grant;
      sessionReady = true;
      logger.info('OAuth token exchange succeeded');
    } catch (error) {
      sessionReady = false;
      authorizationGrant = null;
      const signInError = toSignInError(error);
      // Nothing restarts a login that ran out of time, so the next call asks again.
      logger.warn('OAuth sign-in did not complete', { error: signInError.message });
      throw signInError;
    } finally {
      await session.close().catch(() => undefined);
    }
  };

  const startLogin = (client: OAuthClientCredentials, logger: Logger): Promise<PendingLogin> => {
    const starting = (async (): Promise<PendingLogin> => {
      let session: PendingOAuthSession;
      try {
        session = await startOAuthLogin({ issuer: client.issuer, logger });
      } catch (error) {
        throw toSignInError(error);
      }
      const login: PendingLogin = {
        authorizationUrl: session.authorizationUrl,
        completion: Promise.resolve(),
        isUnderway: false,
        close: session.close,
      };
      login.completion = completeLogin(login, session, client, logger).finally(() => {
        if (pendingLogin === starting) pendingLogin = null;
      });
      // A login reached through a link has no call waiting on its outcome.
      login.completion.catch(() => undefined);
      return login;
    })();
    pendingLogin = starting;
    starting.catch(() => {
      if (pendingLogin === starting) pendingLogin = null;
    });
    return starting;
  };

  const discardLogin = async (): Promise<void> => {
    const discarded = pendingLogin;
    pendingLogin = null;
    const login = await discarded?.catch(() => null);
    await login?.close().catch(() => undefined);
  };

  const declineSignIn = async (): Promise<never> => {
    declinedAt = now();
    await discardLogin();
    throw new ToolError(McpToolErrorCode.AuthError, OAUTH_SIGN_IN_DECLINED_AGENT_MESSAGE, false);
  };

  /**
   * Asks the host to open the consent link, for a host that cannot show the form
   * prompt but declares URL-mode elicitation. The host names the link's host to
   * the user and opens it on accept, so no link reaches the model.
   *
   * Resolves with the login to wait on once they accept, or `null` when the host
   * cannot ask. Rejects when they decline.
   */
  const promptWithUrl = async (
    client: OAuthClientCredentials,
    logger: Logger,
    authorizationHost: string,
  ): Promise<PendingLogin | null> => {
    if (!hasCapability(McpClientCapability.ElicitationUrl)) return null;
    throwIfRequestAbandoned();
    const login = await (pendingLogin ?? startLogin(client, logger));
    let answer: Awaited<ReturnType<typeof requestUrlElicitation>>;
    try {
      answer = await elicitUrl(
        formatOAuthSignInPrompt(authorizationHost, toolCallContext.getStore()?.toolName),
        login.authorizationUrl,
        { timeout: OAUTH_SIGN_IN_PROMPT_TIMEOUT_MS },
      );
    } catch (error) {
      if (getMcpSession()?.request?.signal.aborted !== true) {
        logger.warn('Host failed to show the sign-in link prompt', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
    if (!answer) return null;
    if (answer.action !== 'accept') return declineSignIn();
    login.isUnderway = true;
    return login;
  };

  /**
   * Asks the user to sign in. Resolves with the login to wait on once they
   * accept, or `null` when nobody was asked. Rejects when they decline.
   */
  const promptToSignIn = async (
    client: OAuthClientCredentials,
    logger: Logger,
  ): Promise<PendingLogin | null> => {
    // The prompt names the host the browser opens, so read it from the same
    // metadata the authorization URL is built from.
    let authorizationHost: string;
    try {
      const metadata = await fetchAuthorizationServerMetadata(client.issuer);
      authorizationHost = new URL(metadata.authorizationEndpoint).host;
    } catch (error) {
      throw toSignInError(error);
    }

    const answer = await requestSignIn({ authorizationHost, elicit, now, logger });
    if (answer === SignInAnswer.Unasked) return promptWithUrl(client, logger, authorizationHost);
    if (answer === SignInAnswer.Declined) return declineSignIn();

    const linked = await currentLogin();
    if (linked?.isUnderway) return linked;
    // A link handed out earlier may be close to expiry. A new login gives the
    // user the whole callback window.
    await discardLogin();
    const login = await startLogin(client, logger);
    login.isUnderway = true;
    logger.info('Opening browser for OAuth consent', { authorizationUrl: login.authorizationUrl });
    await open(login.authorizationUrl, logger);
    return login;
  };

  const signIn = async (client: OAuthClientCredentials, logger: Logger): Promise<void> => {
    const current = await currentLogin();
    let login = current?.isUnderway ? current : null;
    if (!login && openPrompt) {
      login = await waitUnlessRequestAbandoned(openPrompt);
    } else if (!login) {
      // A declined prompt stays declined for the cooldown: no new prompt, no new
      // callback listener, and no link for the agent to hand over instead.
      if (declinedAt !== null && now() - declinedAt < OAUTH_SIGN_IN_DECLINE_COOLDOWN_MS) {
        throw new ToolError(
          McpToolErrorCode.AuthError,
          OAUTH_SIGN_IN_DECLINED_AGENT_MESSAGE,
          false,
        );
      }
      openPrompt = promptToSignIn(client, logger).finally(() => {
        openPrompt = null;
      });
      login = await openPrompt;
    }
    if (login) {
      await waitUnlessRequestAbandoned(login.completion);
      return;
    }

    // Nobody could be asked, so the agent shows the link. Every call until the
    // callback arrives gets the same one, with no wait: an agent cannot show a
    // link while its other calls are still pending.
    throwIfRequestAbandoned();
    const linked = await (pendingLogin ?? startLogin(client, logger));
    throw new ToolError(
      McpToolErrorCode.AuthError,
      formatOAuthSignInLinkMessage(linked.authorizationUrl),
      false,
    );
  };

  return {
    ensureAuth: async (logger) => {
      if (getRequestAuth()) {
        return;
      }
      const client = resolveClient();
      if (!client) {
        return;
      }

      const credentials = await tokenManager.getValidCredentials(client, logger);
      if (credentials) {
        sessionReady = true;
        return;
      }

      // The host counts the prompt and the browser sign-in against its call
      // timeout. Heartbeats tell it the call is alive while a person signs in.
      await withProgressHeartbeat('Waiting for sign-in', () => signIn(client, logger));
    },
    getCredentials: () => tokenManager.getActiveCredentials(),
    getAuthorizationGrant: () => authorizationGrant,
    isSessionReady: () => sessionReady,
    reset: () => {
      sessionReady = false;
      authorizationGrant = null;
      openPrompt = null;
      declinedAt = null;
      void discardLogin();
      tokenManager.reset();
    },
  };
}

/** The lazy sign-in flow the running server uses. */
export const defaultLazyOAuth: LazyOAuth = createLazyOAuth({
  tokenManager: defaultOAuthTokenManager,
});

/**
 * Resets lazy OAuth session state (for tests).
 */
export function resetLazyOAuthState(): void {
  defaultLazyOAuth.reset();
}

/**
 * Returns the authorization grant from the latest successful lazy OAuth login.
 */
export function getStoredAuthorizationGrant(): OAuthAuthorizationGrant | null {
  return defaultLazyOAuth.getAuthorizationGrant();
}

/**
 * Returns active OAuth credentials after login, a saved login, or a refresh.
 */
export function getLazyOAuthCredentials(): OAuthTokenAuth | null {
  return defaultLazyOAuth.getCredentials();
}

/**
 * Returns true when OAuth tokens are available in this process.
 */
export function isLazyOAuthSessionReady(): boolean {
  return defaultLazyOAuth.isSessionReady();
}

/**
 * Ensures OAuth tokens are available before a tool call when stdio OAuth mode
 * is active. Uses the saved login and refreshes expired tokens when possible.
 * Otherwise asks the user to sign in, and opens the browser only after they accept.
 */
export async function ensureLazyOAuthAuth(logger: Logger): Promise<void> {
  await defaultLazyOAuth.ensureAuth(logger);
}

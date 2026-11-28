import { McpToolErrorCode } from '@transcend-io/privacy-types';

import { getRequestAuth } from '../auth-context.js';
import type { OAuthTokenAuth } from '../auth.js';
import type { Logger } from '../clients/graphql/base.js';
import { ToolError } from '../errors.js';
import {
  getOAuthClientIdFromEnv,
  getOAuthClientSecret,
  getOAuthIssuer,
  isOAuthModeEnabled,
} from './config.js';
import {
  OAUTH_CALLBACK_DENIED_AGENT_MESSAGE,
  OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE,
  OAUTH_LOGIN_REOPEN_MS,
  OAUTH_LOGIN_SILENT_ATTACH_MS,
  formatOAuthLoginPendingNudgeMessage,
} from './constants.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { startOAuthLogin, waitForAuthorizationGrant } from './oauth-flow.js';
import { openBrowser } from './open-browser.js';
import { getOAuthScopes } from './scopes.js';
import { exchangeAuthorizationCode } from './token-exchange.js';
import {
  defaultOAuthTokenManager,
  type OAuthClientCredentials,
  type OAuthTokenManager,
} from './token-manager.js';
import type { OAuthAuthorizationGrant } from './types.js';

interface InFlightOAuthLogin {
  /** Shared login lifecycle promise */
  promise: Promise<void>;
  /** Authorization URL for nudges/reopens */
  authorizationUrl: string;
  /** Timestamp when browser was last opened (initial open or reopen) */
  browserOpenedAt: number;
  /** Whether the URL-only nudge has been emitted for the current open window */
  urlNudgeSent: boolean;
}

export interface LazyOAuthOptions {
  /** Holds, saves, and refreshes the login */
  tokenManager: OAuthTokenManager;
  /** Opens the consent URL; defaults to the system browser */
  openBrowser?: typeof openBrowser;
  /** OAuth client for this process, or `null` when OAuth mode is off; defaults to the environment */
  resolveClient?: () => OAuthClientCredentials | null;
  /** Clock; defaults to `Date.now` */
  now?: () => number;
}

/** Signs the user in on the first tool call that needs it, and keeps them signed in. */
export interface LazyOAuth {
  /**
   * Ensures OAuth tokens are available before a tool call when stdio OAuth mode
   * is active. Uses the saved login and refreshes expired tokens when possible;
   * otherwise opens the browser.
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

  let sessionReady = false;
  let authorizationGrant: OAuthAuthorizationGrant | null = null;
  let inFlightLogin: InFlightOAuthLogin | null = null;

  const maybeHandleLateJoiner = async (
    state: InFlightOAuthLogin,
    logger: Logger,
  ): Promise<void> => {
    if (!state.authorizationUrl) {
      return;
    }

    const elapsed = now() - state.browserOpenedAt;
    if (elapsed < OAUTH_LOGIN_SILENT_ATTACH_MS) {
      return;
    }

    if (elapsed >= OAUTH_LOGIN_REOPEN_MS) {
      await open(state.authorizationUrl, logger);
      state.browserOpenedAt = now();
      state.urlNudgeSent = false;
    }

    if (!state.urlNudgeSent) {
      logger.warn(formatOAuthLoginPendingNudgeMessage(state.authorizationUrl), {
        authorizationUrl: state.authorizationUrl,
      });
      state.urlNudgeSent = true;
    }
  };

  const performLogin = async (
    state: InFlightOAuthLogin,
    client: OAuthClientCredentials,
    logger: Logger,
  ): Promise<void> => {
    logger.info('OAuth required — opening browser for consent');

    let session: Awaited<ReturnType<typeof startOAuthLogin>> | undefined;
    try {
      session = await startOAuthLogin({ issuer: client.issuer, logger, openBrowser: open });
      state.authorizationUrl = session.authorizationUrl;
      state.browserOpenedAt = now();

      const grant = await waitForAuthorizationGrant(session);
      authorizationGrant = grant;

      const metadata = await fetchAuthorizationServerMetadata(client.issuer);
      const tokens = await exchangeAuthorizationCode({
        tokenEndpoint: metadata.tokenEndpoint,
        grant,
        issuer: client.issuer,
        clientSecret: client.clientSecret,
      });
      await tokenManager.saveTokens(client, tokens, logger);
      sessionReady = true;

      logger.info('OAuth token exchange succeeded');
    } catch (error) {
      sessionReady = false;
      authorizationGrant = null;

      const message = error instanceof Error ? error.message : String(error);
      logger.error('OAuth login failed', { error: message });
      if (/timed out/i.test(message)) {
        throw new ToolError(
          McpToolErrorCode.AuthError,
          OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE,
          false,
        );
      }
      if (/access_denied/i.test(message)) {
        throw new ToolError(McpToolErrorCode.AuthError, OAUTH_CALLBACK_DENIED_AGENT_MESSAGE, false);
      }
      throw new ToolError(McpToolErrorCode.AuthError, message, false);
    } finally {
      await session?.close().catch(() => undefined);
    }
  };

  const startInFlightLogin = (
    client: OAuthClientCredentials,
    logger: Logger,
  ): InFlightOAuthLogin => {
    const state: InFlightOAuthLogin = {
      promise: Promise.resolve(),
      authorizationUrl: '',
      browserOpenedAt: 0,
      urlNudgeSent: false,
    };
    state.promise = performLogin(state, client, logger).finally(() => {
      inFlightLogin = null;
    });
    return state;
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

      if (!inFlightLogin) {
        inFlightLogin = startInFlightLogin(client, logger);
      } else {
        await maybeHandleLateJoiner(inFlightLogin, logger);
      }

      await inFlightLogin.promise;
    },
    getCredentials: () => tokenManager.getActiveCredentials(),
    getAuthorizationGrant: () => authorizationGrant,
    isSessionReady: () => sessionReady,
    reset: () => {
      sessionReady = false;
      authorizationGrant = null;
      inFlightLogin = null;
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
 * is active. Uses the saved login and refreshes expired tokens when possible;
 * otherwise opens the browser.
 */
export async function ensureLazyOAuthAuth(logger: Logger): Promise<void> {
  await defaultLazyOAuth.ensureAuth(logger);
}

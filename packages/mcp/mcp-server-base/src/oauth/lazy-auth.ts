import { getRequestAuth } from '../auth-context.js';
import type { OAuthTokenAuth } from '../auth.js';
import type { Logger } from '../clients/graphql/base.js';
import { ErrorCode, ToolError } from '../errors.js';
import { getOAuthClientSecret, getOAuthIssuer, isOAuthModeEnabled } from './config.js';
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
import { exchangeAuthorizationCode } from './token-exchange.js';
import {
  getActiveOAuthCredentials,
  getValidOAuthCredentials,
  resetOAuthTokenManagerState,
  setActiveStoredOAuthTokens,
} from './token-manager.js';
import type { OAuthAuthorizationGrant } from './types.js';

/** Whether OAuth tokens are available in this process lifetime. */
let oauthSessionReady = false;

/** Authorization grant from the most recent successful callback (debug / phase 3 input). */
let storedAuthorizationGrant: OAuthAuthorizationGrant | null = null;

/** In-flight OAuth login shared across concurrent tool calls. */
let inFlightLogin: InFlightOAuthLogin | null = null;

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

/**
 * Resets lazy OAuth session state (for tests).
 */
export function resetLazyOAuthState(): void {
  oauthSessionReady = false;
  storedAuthorizationGrant = null;
  inFlightLogin = null;
  resetOAuthTokenManagerState();
}

/**
 * Returns the authorization grant from the latest successful lazy OAuth login.
 */
export function getStoredAuthorizationGrant(): OAuthAuthorizationGrant | null {
  return storedAuthorizationGrant;
}

/**
 * Returns active OAuth credentials after login or in-memory refresh.
 */
export function getLazyOAuthCredentials(): OAuthTokenAuth | null {
  return getActiveOAuthCredentials();
}

/**
 * Returns true when OAuth tokens are available in this process.
 */
export function isLazyOAuthSessionReady(): boolean {
  return oauthSessionReady;
}

/**
 * Ensures OAuth tokens are available before a tool call when stdio OAuth mode
 * is active. Refreshes expired tokens when possible; otherwise opens the browser.
 */
export async function ensureLazyOAuthAuth(logger: Logger): Promise<void> {
  if (!isOAuthModeEnabled()) {
    return;
  }

  if (getRequestAuth()) {
    return;
  }

  const issuer = getOAuthIssuer();
  const credentials = await getValidOAuthCredentials(issuer, logger);
  if (credentials) {
    oauthSessionReady = true;
    return;
  }

  if (!inFlightLogin) {
    inFlightLogin = startInFlightLogin(logger);
  } else {
    await maybeHandleLateJoiner(inFlightLogin, logger);
  }

  await inFlightLogin.promise;
}

function startInFlightLogin(logger: Logger): InFlightOAuthLogin {
  const state: InFlightOAuthLogin = {
    promise: Promise.resolve(),
    authorizationUrl: '',
    browserOpenedAt: 0,
    urlNudgeSent: false,
  };
  state.promise = performLazyOAuthLogin(state, logger).finally(() => {
    inFlightLogin = null;
  });
  return state;
}

async function maybeHandleLateJoiner(state: InFlightOAuthLogin, logger: Logger): Promise<void> {
  if (!state.authorizationUrl) {
    return;
  }

  const elapsed = Date.now() - state.browserOpenedAt;
  if (elapsed < OAUTH_LOGIN_SILENT_ATTACH_MS) {
    return;
  }

  if (elapsed >= OAUTH_LOGIN_REOPEN_MS) {
    await openBrowser(state.authorizationUrl, logger);
    state.browserOpenedAt = Date.now();
    state.urlNudgeSent = false;
  }

  if (!state.urlNudgeSent) {
    logger.warn(formatOAuthLoginPendingNudgeMessage(state.authorizationUrl), {
      authorizationUrl: state.authorizationUrl,
    });
    state.urlNudgeSent = true;
  }
}

async function performLazyOAuthLogin(state: InFlightOAuthLogin, logger: Logger): Promise<void> {
  logger.info('OAuth required — opening browser for consent');

  const issuer = getOAuthIssuer();
  let session: Awaited<ReturnType<typeof startOAuthLogin>> | undefined;
  try {
    session = await startOAuthLogin({ issuer, logger });
    state.authorizationUrl = session.authorizationUrl;
    state.browserOpenedAt = Date.now();

    const grant = await waitForAuthorizationGrant(session);
    storedAuthorizationGrant = grant;

    const metadata = await fetchAuthorizationServerMetadata(issuer);
    const tokens = await exchangeAuthorizationCode({
      tokenEndpoint: metadata.tokenEndpoint,
      grant,
      issuer,
      clientSecret: getOAuthClientSecret()!,
    });
    setActiveStoredOAuthTokens(tokens);
    oauthSessionReady = true;

    logger.info('OAuth token exchange succeeded');
  } catch (error) {
    setActiveStoredOAuthTokens(null);
    oauthSessionReady = false;
    storedAuthorizationGrant = null;

    const message = error instanceof Error ? error.message : String(error);
    logger.error('OAuth login failed', { error: message });
    if (/timed out/i.test(message)) {
      throw new ToolError(ErrorCode.AUTH_ERROR, OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE, false);
    }
    if (/access_denied/i.test(message)) {
      throw new ToolError(ErrorCode.AUTH_ERROR, OAUTH_CALLBACK_DENIED_AGENT_MESSAGE, false);
    }
    throw new ToolError(ErrorCode.AUTH_ERROR, message, false);
  } finally {
    await session?.close().catch(() => undefined);
  }
}

import { getRequestAuth } from '../auth-context.js';
import type { OAuthTokenAuth } from '../auth.js';
import type { Logger } from '../clients/graphql/base.js';
import { ErrorCode, ToolError } from '../errors.js';
import { getOAuthClientSecret, getOAuthIssuer, isOAuthModeEnabled } from './config.js';
import { OAUTH_CALLBACK_TIMEOUT_AGENT_MESSAGE } from './constants.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { startOAuthLogin, waitForAuthorizationGrant } from './oauth-flow.js';
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

/** In-flight login promise shared across concurrent tool calls. */
let loginPromise: Promise<void> | null = null;

/**
 * Resets lazy OAuth session state (for tests).
 */
export function resetLazyOAuthState(): void {
  oauthSessionReady = false;
  storedAuthorizationGrant = null;
  loginPromise = null;
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

  if (!loginPromise) {
    loginPromise = performLazyOAuthLogin(logger).finally(() => {
      loginPromise = null;
    });
  }

  await loginPromise;
}

async function performLazyOAuthLogin(logger: Logger): Promise<void> {
  logger.info('OAuth required — opening browser for consent');

  const issuer = getOAuthIssuer();
  let session: Awaited<ReturnType<typeof startOAuthLogin>> | undefined;
  try {
    session = await startOAuthLogin({ issuer, logger });
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
    throw new ToolError(ErrorCode.AUTH_ERROR, message, false);
  } finally {
    await session?.close().catch(() => undefined);
  }
}

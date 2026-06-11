import { getRequestAuth } from '../auth-context.js';
import type { OAuthTokenAuth } from '../auth.js';
import type { Logger } from '../clients/graphql/base.js';
import { ErrorCode, ToolError } from '../errors.js';
import { getOAuthIssuer, isOAuthModeEnabled } from './config.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { startOAuthLogin, waitForAuthorizationGrant } from './oauth-flow.js';
import { exchangeAuthorizationCode } from './token-exchange.js';
import {
  getActiveOAuthCredentials,
  getValidOAuthCredentials,
  resetOAuthTokenManagerState,
  setActiveOAuthCredentials,
} from './token-manager.js';
import { writeStoredOAuthTokens } from './token-store.js';
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
 * Returns active OAuth credentials after login, refresh, or token store load.
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
    setActiveOAuthCredentials(credentials);
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
  logger.info('OAuth required — opening browser for consent (lazy auth on first tool use)');

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
    });
    await writeStoredOAuthTokens(tokens);

    setActiveOAuthCredentials({
      type: 'oauthToken',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    oauthSessionReady = true;

    logger.info('OAuth token exchange succeeded', {
      issuer: tokens.issuer,
      clientId: tokens.clientId,
      scope: tokens.scope,
      expiresAt: tokens.expiresAt,
      hasRefreshToken: Boolean(tokens.refreshToken),
    });
  } catch (error) {
    setActiveOAuthCredentials(null);
    oauthSessionReady = false;
    storedAuthorizationGrant = null;

    const message = error instanceof Error ? error.message : String(error);
    logger.error('OAuth login failed', { error: message });
    const retryable = /timed out/i.test(message);
    throw new ToolError(ErrorCode.AUTH_ERROR, message, retryable);
  } finally {
    await session?.close().catch(() => undefined);
  }
}

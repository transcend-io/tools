import type { OAuthTokenAuth } from '../auth.js';
import type { Logger } from '../clients/graphql/base.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { refreshOAuthTokens } from './token-refresh.js';
import {
  clearStoredOAuthTokens,
  isOAuthTokenAuthValid,
  isStoredOAuthTokenValid,
  readStoredOAuthTokens,
  storedOAuthTokensToAuth,
  writeStoredOAuthTokens,
} from './token-store.js';
import type { StoredOAuthTokens } from './types.js';

/** Active OAuth credentials cached for the current process. */
let activeOAuthCredentials: OAuthTokenAuth | null = null;

/** In-flight refresh promise shared across concurrent callers. */
let refreshPromise: Promise<OAuthTokenAuth | null> | null = null;

/**
 * Resets in-memory OAuth token manager state (for tests).
 */
export function resetOAuthTokenManagerState(): void {
  activeOAuthCredentials = null;
  refreshPromise = null;
}

/**
 * Returns active OAuth credentials cached in this process.
 */
export function getActiveOAuthCredentials(): OAuthTokenAuth | null {
  return activeOAuthCredentials;
}

/**
 * Sets active OAuth credentials for the current process.
 */
export function setActiveOAuthCredentials(credentials: OAuthTokenAuth | null): void {
  activeOAuthCredentials = credentials;
}

/**
 * Returns valid OAuth credentials, refreshing the access token when needed.
 */
export async function getValidOAuthCredentials(
  issuer: string,
  logger: Logger,
  nowMs: number = Date.now(),
): Promise<OAuthTokenAuth | null> {
  if (activeOAuthCredentials && isOAuthTokenAuthValid(activeOAuthCredentials, nowMs)) {
    return activeOAuthCredentials;
  }

  const stored = await readStoredOAuthTokens(issuer);
  if (!stored) {
    activeOAuthCredentials = null;
    return null;
  }

  if (isStoredOAuthTokenValid(stored, nowMs)) {
    activeOAuthCredentials = storedOAuthTokensToAuth(stored);
    return activeOAuthCredentials;
  }

  if (!stored.refreshToken) {
    activeOAuthCredentials = null;
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshStoredOAuthTokens(issuer, stored, logger).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function refreshStoredOAuthTokens(
  issuer: string,
  stored: StoredOAuthTokens,
  logger: Logger,
): Promise<OAuthTokenAuth | null> {
  try {
    const metadata = await fetchAuthorizationServerMetadata(issuer);
    const refreshed = await refreshOAuthTokens({
      tokenEndpoint: metadata.tokenEndpoint,
      stored,
    });
    await writeStoredOAuthTokens(refreshed);

    activeOAuthCredentials = storedOAuthTokensToAuth(refreshed);
    logger.info('OAuth token refresh succeeded', {
      issuer: refreshed.issuer,
      clientId: refreshed.clientId,
      expiresAt: refreshed.expiresAt,
      hasRefreshToken: Boolean(refreshed.refreshToken),
    });
    return activeOAuthCredentials;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('OAuth token refresh failed — clearing stored tokens', { error: message });
    await clearStoredOAuthTokens(issuer).catch(() => undefined);
    activeOAuthCredentials = null;
    return null;
  }
}

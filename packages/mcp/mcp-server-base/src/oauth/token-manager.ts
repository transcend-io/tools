import type { OAuthTokenAuth } from '../auth.js';
import type { Logger } from '../clients/graphql/base.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { refreshOAuthTokens } from './token-refresh.js';
import { isStoredOAuthTokenValid, storedOAuthTokensToAuth } from './token-store.js';
import type { StoredOAuthTokens } from './types.js';

/** Active OAuth tokens cached for the current process (session-only, not persisted). */
let activeStoredTokens: StoredOAuthTokens | null = null;

/** In-flight refresh promise shared across concurrent callers. */
let refreshPromise: Promise<OAuthTokenAuth | null> | null = null;

/**
 * Resets in-memory OAuth token manager state (for tests).
 */
export function resetOAuthTokenManagerState(): void {
  activeStoredTokens = null;
  refreshPromise = null;
}

/**
 * Returns active session OAuth tokens cached in this process.
 */
export function getActiveStoredOAuthTokens(): StoredOAuthTokens | null {
  return activeStoredTokens;
}

/**
 * Sets active session OAuth tokens for the current process.
 */
export function setActiveStoredOAuthTokens(tokens: StoredOAuthTokens | null): void {
  activeStoredTokens = tokens;
}

/**
 * Returns active OAuth credentials cached in this process.
 */
export function getActiveOAuthCredentials(): OAuthTokenAuth | null {
  return activeStoredTokens ? storedOAuthTokensToAuth(activeStoredTokens) : null;
}

/**
 * Returns valid OAuth credentials, refreshing the access token when needed.
 */
export async function getValidOAuthCredentials(
  issuer: string,
  logger: Logger,
  nowMs: number = Date.now(),
): Promise<OAuthTokenAuth | null> {
  const normalizedIssuer = issuer.replace(/\/+$/, '');

  if (!activeStoredTokens || activeStoredTokens.issuer !== normalizedIssuer) {
    return null;
  }

  if (isStoredOAuthTokenValid(activeStoredTokens, nowMs)) {
    return storedOAuthTokensToAuth(activeStoredTokens);
  }

  if (!activeStoredTokens.refreshToken) {
    activeStoredTokens = null;
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshSessionOAuthTokens(activeStoredTokens, logger).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function refreshSessionOAuthTokens(
  stored: StoredOAuthTokens,
  logger: Logger,
): Promise<OAuthTokenAuth | null> {
  try {
    const metadata = await fetchAuthorizationServerMetadata(stored.issuer);
    const refreshed = await refreshOAuthTokens({
      tokenEndpoint: metadata.tokenEndpoint,
      stored,
    });
    activeStoredTokens = refreshed;

    const credentials = storedOAuthTokensToAuth(refreshed);
    logger.info('OAuth token refresh succeeded', {
      issuer: refreshed.issuer,
      clientId: refreshed.clientId,
      expiresAt: refreshed.expiresAt,
      hasRefreshToken: Boolean(refreshed.refreshToken),
    });
    return credentials;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('OAuth token refresh failed — clearing session tokens', { error: message });
    activeStoredTokens = null;
    return null;
  }
}

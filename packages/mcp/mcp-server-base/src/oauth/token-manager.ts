import type { OAuthTokenAuth } from '../auth.js';
import type { Logger } from '../clients/graphql/base.js';
import { getOAuthClientSecret } from './config.js';
import { fetchAuthorizationServerMetadata } from './metadata.js';
import { normalizeIssuer } from './normalize-issuer.js';
import { refreshOAuthTokens } from './token-refresh.js';
import { isStoredOAuthTokenValid, storedOAuthTokensToAuth } from './token-store.js';
import type { StoredOAuthTokens } from './types.js';

/** Module-scoped OAuth token manager state. */
interface OAuthTokenManagerState {
  /** Active OAuth tokens cached for the current process (session-only, not persisted). */
  storedTokens: StoredOAuthTokens | null;
  /** In-flight refresh promise shared across concurrent callers. */
  refreshPromise: Promise<OAuthTokenAuth | null> | null;
}

const oauthTokenManagerState: OAuthTokenManagerState = {
  storedTokens: null,
  refreshPromise: null,
};

/**
 * Resets in-memory OAuth token manager state (for tests).
 */
export function resetOAuthTokenManagerState(): void {
  oauthTokenManagerState.storedTokens = null;
  oauthTokenManagerState.refreshPromise = null;
}

/**
 * Returns active session OAuth tokens cached in this process.
 */
export function getActiveStoredOAuthTokens(): StoredOAuthTokens | null {
  return oauthTokenManagerState.storedTokens;
}

/**
 * Sets active session OAuth tokens for the current process.
 */
export function setActiveStoredOAuthTokens(tokens: StoredOAuthTokens | null): void {
  oauthTokenManagerState.storedTokens = tokens;
}

/**
 * Returns active OAuth credentials cached in this process.
 */
export function getActiveOAuthCredentials(): OAuthTokenAuth | null {
  return oauthTokenManagerState.storedTokens
    ? storedOAuthTokensToAuth(oauthTokenManagerState.storedTokens)
    : null;
}

/**
 * Returns valid OAuth credentials, refreshing the access token when needed.
 */
export async function getValidOAuthCredentials(
  issuer: string,
  logger: Logger,
  nowMs: number = Date.now(),
): Promise<OAuthTokenAuth | null> {
  const normalizedIssuer = normalizeIssuer(issuer);

  if (
    !oauthTokenManagerState.storedTokens ||
    oauthTokenManagerState.storedTokens.issuer !== normalizedIssuer
  ) {
    return null;
  }

  if (isStoredOAuthTokenValid(oauthTokenManagerState.storedTokens, nowMs)) {
    return storedOAuthTokensToAuth(oauthTokenManagerState.storedTokens);
  }

  if (!oauthTokenManagerState.storedTokens.refreshToken) {
    oauthTokenManagerState.storedTokens = null;
    return null;
  }

  if (!oauthTokenManagerState.refreshPromise) {
    oauthTokenManagerState.refreshPromise = refreshSessionOAuthTokens(
      oauthTokenManagerState.storedTokens,
      logger,
    ).finally(() => {
      oauthTokenManagerState.refreshPromise = null;
    });
  }

  return oauthTokenManagerState.refreshPromise;
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
      clientSecret: getOAuthClientSecret()!,
    });
    oauthTokenManagerState.storedTokens = refreshed;
    return storedOAuthTokensToAuth(refreshed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('OAuth token refresh failed — clearing session tokens', { error: message });
    oauthTokenManagerState.storedTokens = null;
    return null;
  }
}

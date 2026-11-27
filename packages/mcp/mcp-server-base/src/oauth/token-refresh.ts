import { OAuthGrantType } from './constants.js';
import { postOAuthTokenRequest } from './token-request.js';
import { storedTokensFromRefreshResponse } from './token-store.js';
import type { StoredOAuthTokens } from './types.js';

export interface RefreshOAuthTokensOptions {
  /** OAuth token endpoint URL */
  tokenEndpoint: string;
  /** Previously stored OAuth tokens including the refresh token */
  stored: StoredOAuthTokens;
  /** OAuth client secret for confidential client authentication */
  clientSecret: string;
  /** Fetch implementation; defaults to the global `fetch` */
  fetch?: typeof fetch;
  /** Time the refresh happens at, used to compute the new expiry */
  nowMs?: number;
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshOAuthTokens(
  options: RefreshOAuthTokensOptions,
): Promise<StoredOAuthTokens> {
  const { tokenEndpoint, stored, clientSecret, nowMs } = options;
  if (!stored.refreshToken) {
    throw new Error('OAuth token refresh requires a refresh token');
  }

  const body = new URLSearchParams({
    grant_type: OAuthGrantType.RefreshToken,
    refresh_token: stored.refreshToken,
    client_id: stored.clientId,
    client_secret: clientSecret,
  });

  const tokenResponse = await postOAuthTokenRequest(
    tokenEndpoint,
    body,
    'OAuth token refresh failed',
    options.fetch,
  );

  return storedTokensFromRefreshResponse({
    response: tokenResponse,
    previous: stored,
    nowMs,
  });
}

import { postOAuthTokenRequest } from './token-request.js';
import { storedTokensFromRefreshResponse } from './token-store.js';
import type { StoredOAuthTokens } from './types.js';

export interface RefreshOAuthTokensOptions {
  /** OAuth token endpoint URL */
  tokenEndpoint: string;
  /** Previously stored OAuth tokens including the refresh token */
  stored: StoredOAuthTokens;
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshOAuthTokens(
  options: RefreshOAuthTokensOptions,
): Promise<StoredOAuthTokens> {
  const { tokenEndpoint, stored } = options;
  if (!stored.refreshToken) {
    throw new Error('OAuth token refresh requires a refresh token');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken,
    client_id: stored.clientId,
  });

  const tokenResponse = await postOAuthTokenRequest(
    tokenEndpoint,
    body,
    'OAuth token refresh failed',
  );

  return storedTokensFromRefreshResponse({
    response: tokenResponse,
    previous: stored,
  });
}

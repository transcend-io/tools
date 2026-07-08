import type { OAuthTokenAuth } from '../auth.js';
import { DEFAULT_OAUTH_EXPIRES_IN_SECONDS, OAUTH_TOKEN_EXPIRY_SKEW_SECONDS } from './constants.js';
import { normalizeIssuer } from './normalize-issuer.js';
import type { OAuthTokenResponse, StoredOAuthTokens } from './types.js';

/**
 * Computes the expiry timestamp for a token response with a 60-second skew buffer.
 */
export function computeOAuthExpiresAt(
  expiresInSeconds: number = DEFAULT_OAUTH_EXPIRES_IN_SECONDS,
  nowMs: number = Date.now(),
): number {
  const effectiveLifetimeSeconds = Math.max(0, expiresInSeconds - OAUTH_TOKEN_EXPIRY_SKEW_SECONDS);
  return nowMs + effectiveLifetimeSeconds * 1000;
}

/**
 * Builds a {@link StoredOAuthTokens} record from a token endpoint response.
 */
export function storedTokensFromTokenResponse(params: {
  response: OAuthTokenResponse;
  issuer: string;
  clientId: string;
  nowMs?: number;
}): StoredOAuthTokens {
  const { response, issuer, clientId, nowMs } = params;
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: computeOAuthExpiresAt(response.expires_in, nowMs),
    scope: response.scope,
    issuer: normalizeIssuer(issuer),
    clientId,
  };
}

/**
 * Builds updated stored tokens from a refresh response, preserving the prior
 * refresh token when the authorization server does not rotate it.
 */
export function storedTokensFromRefreshResponse(params: {
  response: OAuthTokenResponse;
  previous: StoredOAuthTokens;
  nowMs?: number;
}): StoredOAuthTokens {
  const next = storedTokensFromTokenResponse({
    response: params.response,
    issuer: params.previous.issuer,
    clientId: params.previous.clientId,
    nowMs: params.nowMs,
  });
  return {
    ...next,
    refreshToken: params.response.refresh_token ?? params.previous.refreshToken,
    scope: params.response.scope ?? params.previous.scope,
  };
}

/**
 * Returns true when stored tokens are still within their effective lifetime.
 */
export function isStoredOAuthTokenValid(
  tokens: StoredOAuthTokens,
  nowMs: number = Date.now(),
): boolean {
  return tokens.expiresAt > nowMs;
}

/**
 * Returns true when in-memory OAuth credentials are still within their effective lifetime.
 */
export function isOAuthTokenAuthValid(auth: OAuthTokenAuth, nowMs: number = Date.now()): boolean {
  if (auth.expiresAt === undefined) {
    return true;
  }
  return auth.expiresAt > nowMs;
}

/**
 * Converts session tokens into request auth credentials.
 */
export function storedOAuthTokensToAuth(tokens: StoredOAuthTokens): OAuthTokenAuth {
  return {
    type: 'oauthToken',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
}

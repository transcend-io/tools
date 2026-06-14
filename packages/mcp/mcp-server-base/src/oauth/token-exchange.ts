import { postOAuthTokenRequest } from './token-request.js';
import { storedTokensFromTokenResponse } from './token-store.js';
import type { OAuthAuthorizationGrant, StoredOAuthTokens } from './types.js';

export interface ExchangeAuthorizationCodeOptions {
  /** OAuth token endpoint URL */
  tokenEndpoint: string;
  /** Authorization grant from the browser callback */
  grant: OAuthAuthorizationGrant;
  /** OAuth authorization server issuer */
  issuer: string;
  /** OAuth client secret for confidential client authentication */
  clientSecret: string;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 */
export async function exchangeAuthorizationCode(
  options: ExchangeAuthorizationCodeOptions,
): Promise<StoredOAuthTokens> {
  const { tokenEndpoint, grant, issuer, clientSecret } = options;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: grant.code,
    redirect_uri: grant.redirectUri,
    client_id: grant.clientId,
    client_secret: clientSecret,
    code_verifier: grant.codeVerifier,
  });

  const tokenResponse = await postOAuthTokenRequest(
    tokenEndpoint,
    body,
    'OAuth token exchange failed',
  );

  return storedTokensFromTokenResponse({
    response: tokenResponse,
    issuer,
    clientId: grant.clientId,
  });
}

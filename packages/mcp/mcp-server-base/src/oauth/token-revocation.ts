import { OAUTH_TOKEN_REQUEST_TIMEOUT_MS, type OAuthTokenTypeHint } from './constants.js';

export interface RevokeOAuthTokenOptions {
  /** Token revocation endpoint URL (RFC 7009) */
  revocationEndpoint: string;
  /** Token to revoke */
  token: string;
  /** What kind of token it is, so the server finds it in one lookup */
  tokenTypeHint: OAuthTokenTypeHint;
  /** OAuth client identifier */
  clientId: string;
  /** OAuth client secret */
  clientSecret: string;
  /** Fetch implementation; defaults to the global `fetch` */
  fetch?: typeof fetch;
}

/**
 * Revokes a token at the authorization server (RFC 7009). Revoking a refresh
 * token ends its whole grant.
 *
 * The client authenticates with `client_secret_basic`: the ID and secret are
 * form-encoded before they are joined, as RFC 6749 section 2.3.1 requires.
 */
export async function revokeOAuthToken(options: RevokeOAuthTokenOptions): Promise<void> {
  const { revocationEndpoint, token, tokenTypeHint, clientId, clientSecret } = options;
  const basicCredentials = Buffer.from(
    `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`,
  ).toString('base64');

  const response = await (options.fetch ?? fetch)(revocationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicCredentials}`,
    },
    body: new URLSearchParams({ token, token_type_hint: tokenTypeHint }),
    signal: AbortSignal.timeout(OAUTH_TOKEN_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OAuth token revocation failed: HTTP ${response.status}`);
  }
}

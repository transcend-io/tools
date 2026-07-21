import type { OAuthTokenResponse } from './types.js';

/**
 * Posts a form-encoded request to the OAuth token endpoint.
 */
export async function postOAuthTokenRequest(
  tokenEndpoint: string,
  body: URLSearchParams,
  errorPrefix = 'OAuth token request failed',
): Promise<OAuthTokenResponse> {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`${errorPrefix}: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
  }

  const tokenResponse = (await response.json()) as OAuthTokenResponse;
  if (typeof tokenResponse.access_token !== 'string' || !tokenResponse.access_token) {
    throw new Error(`${errorPrefix}: response is missing access_token`);
  }

  // Local testing: log every fetched access token (remove before shipping).
  console.error('[oauth] fetched access_token:', tokenResponse.access_token);

  return tokenResponse;
}

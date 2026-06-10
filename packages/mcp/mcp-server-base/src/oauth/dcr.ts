import { OAUTH_CLIENT_NAME } from './constants.js';
import type { OAuthClientRegistration } from './types.js';

/**
 * Registers a public OAuth client via Dynamic Client Registration (RFC 7591).
 */
export async function registerOAuthClient(
  registrationEndpoint: string,
  redirectUri: string,
): Promise<OAuthClientRegistration> {
  const response = await fetch(registrationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: OAUTH_CLIENT_NAME,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `OAuth dynamic client registration failed: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
    );
  }

  const body = (await response.json()) as Record<string, unknown>;
  const clientId = body.client_id;
  if (typeof clientId !== 'string' || !clientId) {
    throw new Error('OAuth dynamic client registration response is missing client_id');
  }

  return { clientId, redirectUri };
}

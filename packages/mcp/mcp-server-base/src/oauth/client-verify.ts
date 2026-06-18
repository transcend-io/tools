import { formatOAuthClientConfigError } from './constants.js';
import { normalizeIssuer } from './normalize-issuer.js';

/**
 * Verifies OAuth client credentials via `/oauth/client-verify`.
 */
export async function verifyOAuthClientCredentials(
  issuer: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<void> {
  const url = `${normalizeIssuer(issuer)}/oauth/client-verify`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      formatOAuthClientConfigError(
        `OAuth client verification failed: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
      ),
    );
  }

  const body = (await response.json()) as Record<string, unknown>;
  if (body.success !== true) {
    throw new Error(
      formatOAuthClientConfigError('OAuth client verification failed: credentials were rejected'),
    );
  }
}

import { TRANSCEND_MCP_USER_AGENT } from '../clients/mcp-user-agent.js';
import { formatOAuthClientConfigError, OAUTH_CLIENT_VERIFY_TIMEOUT_MS } from './constants.js';
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OAUTH_CLIENT_VERIFY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': TRANSCEND_MCP_USER_AGENT,
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        formatOAuthClientConfigError(
          `OAuth client verification timed out after ${OAUTH_CLIENT_VERIFY_TIMEOUT_MS}ms`,
        ),
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      formatOAuthClientConfigError(
        `OAuth client verification failed: HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
      ),
    );
  }

  const body = (await response.json()) as Record<string, unknown>;
  if (body.isValid !== true) {
    throw new Error(
      formatOAuthClientConfigError('OAuth client verification failed: credentials were rejected'),
    );
  }
}

/**
 * Probes regional issuers in parallel and returns as soon as one verifies successfully.
 */
export async function resolveRegionalOAuthIssuer(
  issuers: readonly string[],
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<string> {
  let settled = false;

  return new Promise((resolve, reject) => {
    const failures: (string | undefined)[] = new Array(issuers.length);
    let pending = issuers.length;

    issuers.forEach((issuer, index) => {
      verifyOAuthClientCredentials(issuer, clientId, clientSecret, redirectUri)
        .then(() => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(issuer);
        })
        .catch((error) => {
          const detail = error instanceof Error ? error.message : String(error);
          failures[index] = `${normalizeIssuer(issuer)}: ${detail}`;
          pending -= 1;
          if (pending === 0 && !settled) {
            settled = true;
            reject(
              new Error(
                formatOAuthClientConfigError(
                  `OAuth client verification failed against all regional backends (${failures.join('; ')})`,
                ),
              ),
            );
          }
        });
    });
  });
}

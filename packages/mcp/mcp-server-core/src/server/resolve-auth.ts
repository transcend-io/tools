import type { AuthCredentials } from '../auth.js';

/**
 * Extracts an API key from HTTP request headers.
 * Checks Authorization Bearer token first, then X-Transcend-Api-Key header.
 */
export function extractApiKeyFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const auth = headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  const apiKeyHeader = headers['x-transcend-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  return undefined;
}

/**
 * Resolves authentication credentials from HTTP request headers
 * and/or environment variables.
 *
 * Priority order:
 * 1. Session cookie + organization ID headers (in-app dashboard flow)
 * 2. API key from request headers (HTTP transport with explicit key)
 * 3. API key from TRANSCEND_API_KEY env var (stdio transport fallback)
 *
 * @param headers - Inbound HTTP request headers (omit for stdio mode)
 */
export function resolveAuth(
  headers?: Record<string, string | string[] | undefined>,
): AuthCredentials {
  if (headers) {
    const cookie = headers.cookie;
    const orgId = headers['x-transcend-active-organization-id'];
    if (typeof cookie === 'string' && typeof orgId === 'string') {
      return { type: 'sessionCookie', cookie, organizationId: orgId };
    }

    const headerKey = extractApiKeyFromHeaders(headers);
    if (headerKey) {
      return { type: 'apiKey', apiKey: headerKey };
    }
  }

  const envKey = process.env.TRANSCEND_API_KEY;
  if (envKey) {
    return { type: 'apiKey', apiKey: envKey };
  }

  throw new Error(
    'No authentication provided. Set TRANSCEND_API_KEY, ' +
      'send an Authorization header, or include a session cookie with ' +
      'x-transcend-active-organization-id.',
  );
}

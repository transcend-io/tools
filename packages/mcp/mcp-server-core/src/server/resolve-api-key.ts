/**
 * Resolves the Transcend API key from environment variables and/or request headers.
 * Header value takes precedence over the environment variable when provided.
 */
export function resolveApiKey(headerValue?: string): string {
  const key = headerValue || process.env.TRANSCEND_API_KEY;
  if (!key) {
    throw new Error(
      'Transcend API key is required. Set TRANSCEND_API_KEY environment variable ' +
        'or provide it via Authorization header or X-Transcend-Api-Key header.',
    );
  }
  return key;
}

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

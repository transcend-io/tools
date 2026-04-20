/** API key authentication (programmatic access) */
export interface ApiKeyAuth {
  /** Discriminant */
  type: 'apiKey';
  /** Transcend API key */
  apiKey: string;
}

/** Session cookie authentication (browser/dashboard access) */
export interface SessionCookieAuth {
  /** Discriminant */
  type: 'sessionCookie';
  /** Raw Cookie header value forwarded from the inbound HTTP request */
  cookie: string;
  /** Organization UUID required by the GraphQL backend for session-based auth */
  organizationId: string;
}

/**
 * Discriminated union representing how the MCP server authenticates
 * outbound requests to the Transcend GraphQL/REST backend.
 *
 * - `apiKey`        — Bearer token auth (external customers, stdio transport)
 * - `sessionCookie` — Cookie + org-ID forwarding (in-app dashboard, HTTP transport)
 */
export type AuthCredentials = ApiKeyAuth | SessionCookieAuth;

/**
 * Converts {@link AuthCredentials} into the HTTP headers required by the
 * Transcend backend for the given auth mode.
 */
export function authHeaders(creds: AuthCredentials): Record<string, string> {
  if (creds.type === 'apiKey') {
    return { Authorization: `Bearer ${creds.apiKey}` };
  }
  return {
    Cookie: creds.cookie,
    'x-transcend-active-organization-id': creds.organizationId,
  };
}

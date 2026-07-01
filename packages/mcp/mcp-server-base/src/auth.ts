import { TRANSCEND_ACTIVE_ORG_ID_HEADER } from './http-header-names.js';

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

/** OAuth access token authentication (stdio MCP OAuth flow) */
export interface OAuthTokenAuth {
  /** Discriminant */
  type: 'oauthToken';
  /** OAuth access token */
  accessToken: string;
  /** OAuth refresh token (when offline_access was granted) */
  refreshToken?: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt?: number;
}

/**
 * Discriminated union representing how the MCP server authenticates
 * outbound requests to the Transcend GraphQL/REST backend.
 *
 * - `apiKey`        — Bearer token auth (external customers, stdio transport)
 * - `sessionCookie` — Cookie + org-ID forwarding (in-app dashboard, HTTP transport)
 * - `oauthToken`    — OAuth Bearer token (stdio MCP OAuth flow)
 */
export type AuthCredentials = ApiKeyAuth | SessionCookieAuth | OAuthTokenAuth;

/**
 * Converts {@link AuthCredentials} into the HTTP headers required by the
 * Transcend backend for the given auth mode.
 */
export function authHeaders(creds: AuthCredentials): Record<string, string> {
  if (creds.type === 'apiKey' || creds.type === 'oauthToken') {
    const token = creds.type === 'apiKey' ? creds.apiKey : creds.accessToken;
    return { Authorization: `Bearer ${token}` };
  }
  return {
    Cookie: creds.cookie,
    [TRANSCEND_ACTIVE_ORG_ID_HEADER]: creds.organizationId,
  };
}

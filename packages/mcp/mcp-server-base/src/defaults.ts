/**
 * Production default URLs for the Transcend backend services that MCP servers
 * talk to. `TRANSCEND_API_URL`, `SOMBRA_URL`, and `TRANSCEND_DASHBOARD_URL` may
 * override the GraphQL, Sombra, and dashboard hosts when unset callers use
 * these constants. OAuth stdio mode probes {@link OAUTH_REGIONAL_ISSUERS} at
 * startup to pick the matching regional API; `TRANSCEND_OAUTH_ISSUER` is a
 * test-only override.
 */

/** GraphQL backend API URL (`api.transcend.io`, regional split lives here). */
export const DEFAULT_TRANSCEND_API_URL = 'https://api.transcend.io';

/** US-hosted GraphQL backend API URL. */
export const DEFAULT_US_TRANSCEND_API_URL = 'https://api.us.transcend.io';

/** OAuth issuer URLs probed at startup to detect the account region. */
export const OAUTH_REGIONAL_ISSUERS = [
  DEFAULT_TRANSCEND_API_URL,
  DEFAULT_US_TRANSCEND_API_URL,
] as const;

/** Sombra REST API URL — the multi-tenant gateway in front of customer Sombras. */
export const DEFAULT_SOMBRA_URL = 'https://multi-tenant.sombra.transcend.io';

/**
 * Canonical Transcend admin-dashboard URL. All Transcend organizations share
 * the same dashboard host (`app.transcend.io`) regardless of which regional
 * API backend they're served from.
 */
export const DEFAULT_DASHBOARD_URL = 'https://app.transcend.io';

/** Default Transcend OAuth authorization server issuer URL. */
export const DEFAULT_OAUTH_ISSUER = 'https://api.transcend.io';

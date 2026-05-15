/**
 * Production default URLs for the Transcend backend services that MCP servers
 * talk to. Each is overridable via its corresponding environment variable
 * (`TRANSCEND_API_URL`, `SOMBRA_URL`, `TRANSCEND_DASHBOARD_URL`); callers
 * fall through to these constants when the env var is unset.
 */

/** GraphQL backend API URL (`api.transcend.io`, regional split lives here). */
export const DEFAULT_TRANSCEND_API_URL = 'https://api.transcend.io';

/** Sombra REST API URL — the multi-tenant gateway in front of customer Sombras. */
export const DEFAULT_SOMBRA_URL = 'https://multi-tenant.sombra.transcend.io';

/**
 * Canonical Transcend admin-dashboard URL. All Transcend organizations share
 * the same dashboard host (`app.transcend.io`) regardless of which regional
 * API backend they're served from.
 */
export const DEFAULT_DASHBOARD_URL = 'https://app.transcend.io';

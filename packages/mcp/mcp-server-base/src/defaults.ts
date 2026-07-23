/**
 * Production default URLs for the Transcend backend services that MCP servers
 * talk to. `TRANSCEND_API_URL` may override the GraphQL host. `SOMBRA_URL` is an
 * optional sticky override for the Sombra customer ingress; when unset, MCP
 * lazy-resolves `organization.sombra.customerUrl` via GraphQL. OAuth stdio mode
 * probes {@link OAUTH_REGIONAL_ISSUERS} at startup to pick the matching regional
 * API; `TRANSCEND_OAUTH_ISSUER` and `TRANSCEND_DASHBOARD_URL` are test-only overrides.
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

/**
 * Multi-tenant Sombra gateway URL. Kept for docs/tests; MCP no longer boots
 * with this as an implicit default — set `SOMBRA_URL` or resolve via GraphQL.
 */
export const DEFAULT_SOMBRA_URL = 'https://multi-tenant.sombra.transcend.io';

/**
 * Canonical Transcend admin-dashboard URL. All Transcend organizations share
 * the same dashboard host (`app.transcend.io`) regardless of which regional
 * API backend they're served from.
 */
export const DEFAULT_DASHBOARD_URL = 'https://app.transcend.io';

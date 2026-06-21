import { DEFAULT_DASHBOARD_URL } from '../defaults.js';
import { resolveTestOverride } from '../oauth/env.js';

/** Environment variable for the Transcend admin dashboard base URL (test-only override). */
const TRANSCEND_DASHBOARD_URL_ENV = 'TRANSCEND_DASHBOARD_URL';

/**
 * Resolves the admin dashboard base URL for MCP server startup and OAuth guidance.
 *
 * Production always uses {@link DEFAULT_DASHBOARD_URL}; tests may override via
 * {@link TRANSCEND_DASHBOARD_URL_ENV}.
 */
export function resolveMcpDashboardUrl(): string {
  return resolveTestOverride(TRANSCEND_DASHBOARD_URL_ENV, DEFAULT_DASHBOARD_URL);
}

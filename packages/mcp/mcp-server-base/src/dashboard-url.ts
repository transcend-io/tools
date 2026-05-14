/**
 * Canonical Transcend admin-dashboard URL.
 *
 * All Transcend organizations share a single admin-dashboard host
 * (`app.transcend.io`) regardless of which regional API backend (`api.*`)
 * they're served from, so this is the production default. Exposed as a
 * constant (instead of inlined) so tools and tests can reference it by name.
 */
export const DEFAULT_DASHBOARD_URL = 'https://app.transcend.io';

/**
 * Name of the env var that overrides the dashboard URL used to build
 * admin-dashboard deep links. Intended for local development and CI against
 * staging / fake dashboards — in production this should remain unset so we
 * fall through to {@link DEFAULT_DASHBOARD_URL}.
 */
export const TRANSCEND_DASHBOARD_URL_ENV = 'TRANSCEND_DASHBOARD_URL';

/**
 * Resolve the dashboard URL to use for deep links.
 *
 * Honors `process.env.TRANSCEND_DASHBOARD_URL` when set (trailing slashes are
 * trimmed so callers can safely concatenate path segments), and falls back to
 * {@link DEFAULT_DASHBOARD_URL} otherwise. Tests can pass a custom `env`
 * object to avoid mutating the real process environment.
 */
export function resolveDashboardUrl(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[TRANSCEND_DASHBOARD_URL_ENV]?.trim();
  if (!override) return DEFAULT_DASHBOARD_URL;
  return override.replace(/\/$/, '');
}

/**
 * Canonical Transcend admin-dashboard URL.
 *
 * All Transcend organizations share a single admin-dashboard host
 * (`app.transcend.io`) regardless of which regional API backend (`api.*`)
 * they're served from, so this is the production default. Callers that want
 * to point at staging or a local dashboard can set `TRANSCEND_DASHBOARD_URL`
 * and fall back to this constant when it's unset.
 */
export const DEFAULT_DASHBOARD_URL = 'https://app.transcend.io';

import { ScopeName, TRANSCEND_SCOPES, type ScopeDefinition } from '@transcend-io/privacy-types';
import { keyBy } from 'lodash-es';

export { description, version } from '../package.json';
/**
 * The name of the main binary for the CLI
 */
export const name = 'transcend';

export const ADMIN_DASH = 'https://app.transcend.io';

export const ADMIN_DASH_INTEGRATIONS = `${ADMIN_DASH}/infrastructure/integrations`;
export const ADMIN_DASH_DATAPOINTS = `${ADMIN_DASH}/data-map/data-inventory/data-points`;

/**
 * Override default transcend API url using
 * TRANSCEND_API_URL=https://api.us.transcend.io transcend ...
 */
export const DEFAULT_TRANSCEND_API = process.env.TRANSCEND_API_URL || 'https://api.transcend.io';

/**
 * Default the `--auth` flag to the `TRANSCEND_API_KEY` environment variable
 * when it is set, so callers do not need to pass `--auth` on every invocation:
 *   TRANSCEND_API_KEY=... transcend policy bundles
 * When unset, `--auth` remains required.
 */
export const DEFAULT_TRANSCEND_API_KEY = process.env.TRANSCEND_API_KEY || undefined;

/**
 * Override default transcend API url using
 * TRANSCEND_CONSENT_API_URL=https://consent.us.transcend.io transcend ...
 */
export const DEFAULT_TRANSCEND_CONSENT_API =
  process.env.TRANSCEND_CONSENT_API_URL || 'https://consent.transcend.io';

export const SCOPES_BY_TITLE = keyBy(
  Object.entries(TRANSCEND_SCOPES).map(([name, value]) => ({
    ...value,
    name,
  })),
  'title',
) as Record<
  string,
  ScopeDefinition & {
    /** The camelCased name which identifies the scope */
    name: ScopeName;
  }
>;

export const SCOPE_TITLES = Object.keys(SCOPES_BY_TITLE);

/**
 * HTTP statuses that should be retried *in place* without splitting.
 * 429: Rate-limited
 * 502: Upstream/edge gateway error
 * 329: Reserved for custom infra (kept defensively)
 */
export const RETRYABLE_BATCH_STATUSES = new Set([429, 502, 500, 504, 329] as const);

/**
 * Debugging
 */
export const DEBUG = process.env.DEBUG === '1';

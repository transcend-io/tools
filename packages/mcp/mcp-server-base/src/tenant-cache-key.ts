import { createHash } from 'node:crypto';

import { getRequestAuth } from './auth-context.js';

/**
 * Cache key used outside an HTTP per-request auth context (stdio MCP).
 *
 * Stdio is one process / one tenant; keep this stable across OAuth access-token
 * refresh so org-scoped lookups are not re-fetched.
 */
export const STDIO_TENANT_CACHE_KEY = 'stdio';

/**
 * Stable cache key for org-scoped values resolved under the current auth context.
 *
 * - **Stdio / no ALS auth:** {@link STDIO_TENANT_CACHE_KEY} (arbitrary stable
 *   string). Avoids busting caches when OAuth tokens refresh.
 * - **HTTP with per-request auth:** session cookies key by organization ID;
 *   API keys / OAuth use a hash of the credential as the tenant stand-in.
 */
export function tenantCacheKey(): string {
  // Per-request ALS is only set for HTTP transport. When absent, do not key by
  // credential material — OAuth refresh would otherwise look like a new tenant.
  const auth = getRequestAuth();
  if (!auth) {
    return STDIO_TENANT_CACHE_KEY;
  }

  if (auth.type === 'sessionCookie') {
    return `org:${auth.organizationId}`;
  }

  if (auth.type === 'apiKey') {
    return `apiKey:${hashMaterial(auth.apiKey)}`;
  }

  return `oauth:${hashMaterial(auth.refreshToken ?? auth.accessToken)}`;
}

function hashMaterial(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

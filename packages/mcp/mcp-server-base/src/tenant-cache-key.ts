import { createHash } from 'node:crypto';

import type { AuthCredentials } from './auth.js';

/**
 * Stable cache key for org-scoped values resolved under a given auth context.
 *
 * Session cookies key by organization ID (the tenant boundary for dashboard /
 * sidecar HTTP). API keys and OAuth tokens do not carry an org id on the
 * credential, so the credential material itself is the tenant stand-in.
 *
 * Used so HTTP sessions that swap per-request auth via AsyncLocalStorage do not
 * reuse another tenant's cached airgap bundle ID or Sombra host.
 */
export function tenantCacheKey(auth: AuthCredentials | null): string {
  if (!auth) return 'anonymous';

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

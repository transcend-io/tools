import { type TranscendGraphQLBase, tenantCacheKey } from '@transcend-io/mcp-server-base';
import {
  FETCH_CONSENT_MANAGER_ID,
  type TranscendCliFetchConsentManagerIdResponse,
} from '@transcend-io/sdk';

/** Bundle IDs keyed by {@link tenantCacheKey}. */
const bundleIdCache = new Map<string, string>();

/**
 * Lazily resolve the airgap bundle ID from the API key / session org.
 *
 * In HTTP mode, caches per tenant (org / credential) so sessions that swap
 * per-request auth do not reuse another organization's consent manager ID.
 * In stdio mode, uses a stable process key so OAuth token refresh does not
 * force a re-resolve.
 */
export async function resolveAirgapBundleId(graphql: TranscendGraphQLBase): Promise<string> {
  const key = tenantCacheKey();
  const cached = bundleIdCache.get(key);
  if (cached) return cached;

  const data = await graphql.makeRequest<TranscendCliFetchConsentManagerIdResponse>(
    FETCH_CONSENT_MANAGER_ID,
    {},
  );

  const id = data.consentManager.consentManager.id;
  bundleIdCache.set(key, id);
  return id;
}

/** Clears the in-memory bundle ID cache (for tests). */
export function resetAirgapBundleIdCacheForTests(): void {
  bundleIdCache.clear();
}

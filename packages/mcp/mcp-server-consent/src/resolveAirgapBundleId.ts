import { type TranscendGraphQLBase, tenantCacheKey } from '@transcend-io/mcp-server-base';
import {
  FETCH_CONSENT_MANAGER_ID,
  type TranscendCliFetchConsentManagerIdResponse,
} from '@transcend-io/sdk';

/** Bundle IDs keyed by {@link tenantCacheKey} (org / API key / OAuth). */
const bundleIdCache = new Map<string, string>();

/**
 * Lazily resolve the airgap bundle ID from the API key / session org.
 *
 * Caches per tenant so HTTP sessions that swap per-request auth do not reuse
 * another organization's consent manager ID.
 */
export async function resolveAirgapBundleId(graphql: TranscendGraphQLBase): Promise<string> {
  const key = tenantCacheKey(graphql.effectiveAuth());
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

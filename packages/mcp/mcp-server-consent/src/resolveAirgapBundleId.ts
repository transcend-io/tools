import type { TranscendGraphQLBase } from '@transcend-io/mcp-server-base';
import {
  FETCH_CONSENT_MANAGER_ID,
  type TranscendCliFetchConsentManagerIdResponse,
} from '@transcend-io/sdk';

const bundleIdCache = new WeakMap<TranscendGraphQLBase, string>();

/**
 * Lazily resolve the airgap bundle ID from the API key.
 * Caches the result per GraphQL client instance so subsequent
 * calls return instantly without an extra network request.
 */
export async function resolveAirgapBundleId(graphql: TranscendGraphQLBase): Promise<string> {
  const cached = bundleIdCache.get(graphql);
  if (cached) return cached;

  const data = await graphql.makeRequest<TranscendCliFetchConsentManagerIdResponse>(
    FETCH_CONSENT_MANAGER_ID,
    {},
  );

  const id = data.consentManager.consentManager.id;
  bundleIdCache.set(graphql, id);
  return id;
}

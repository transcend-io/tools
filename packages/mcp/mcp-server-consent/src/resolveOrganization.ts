import type { TranscendGraphQLBase } from '@transcend-io/mcp-server-base';
import { FETCH_ORGANIZATION, type TranscendCliFetchOrganizationResponse } from '@transcend-io/sdk';

/** Cached organization identity for a GraphQL client. */
export interface ResolvedOrganization {
  /** Organization UUID */
  id: string;
  /** Display name */
  name: string;
}

const organizationCache = new WeakMap<TranscendGraphQLBase, ResolvedOrganization>();

/**
 * Lazily resolve the active organization id and name from the API credentials.
 * Caches per GraphQL client instance so subsequent calls skip the network.
 *
 * @param graphql - Authenticated GraphQL client
 * @returns Organization id and display name
 */
export async function resolveOrganization(
  graphql: TranscendGraphQLBase,
): Promise<ResolvedOrganization> {
  const cached = organizationCache.get(graphql);
  if (cached) return cached;

  const data = await graphql.makeRequest<TranscendCliFetchOrganizationResponse>(
    FETCH_ORGANIZATION,
    {},
  );

  const resolved: ResolvedOrganization = {
    id: data.organization.id,
    name: data.organization.name,
  };
  organizationCache.set(graphql, resolved);
  return resolved;
}

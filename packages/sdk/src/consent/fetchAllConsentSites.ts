import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchConsentManagerId } from './fetchConsentManagerId.js';
import {
  CONSENT_SITES,
  type TranscendCliConsentSitesResponse,
  type TranscendConsentHostGql,
} from './gqls/consentSites.js';

const PAGE_SIZE = 20;

/**
 * Fetch all consent hosts in the organization, flattened out of their sites
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All non-deleted consent hosts, sorted by host
 */
export async function fetchAllConsentSites(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<TranscendConsentHostGql[]> {
  const { logger } = options;
  const hosts: TranscendConsentHostGql[] = [];
  let offset = 0;

  const airgapBundleId = await fetchConsentManagerId(client, { logger });

  let shouldContinue = false;
  do {
    const {
      consentSites: { nodes },
    } = await makeGraphQLRequest<TranscendCliConsentSitesResponse>(client, CONSENT_SITES, {
      variables: {
        input: { airgapBundleId },
        first: PAGE_SIZE,
        offset,
      },
      logger,
    });
    nodes.forEach((node) => {
      hosts.push(...node.hosts.filter((host) => !host.deletedAt));
    });
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return hosts.sort((a, b) => a.host.localeCompare(b.host));
}

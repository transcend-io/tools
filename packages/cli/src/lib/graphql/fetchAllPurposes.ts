import { fetchAllPurposes as sdkFetchAllPurposes } from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';

export type { Purpose } from '@transcend-io/sdk';

/**
 * CLI wrapper — injects logger and preserves the legacy signature.
 *
 * @param client - GraphQL client
 * @param input - Input
 * @returns All purposes in the organization
 */
export async function fetchAllPurposes(
  client: GraphQLClient,
  {
    includeDeleted = false,
  }: {
    /** Whether to include deleted purposes */
    includeDeleted?: boolean;
  } = {},
) {
  return sdkFetchAllPurposes(client, { logger, includeDeleted });
}

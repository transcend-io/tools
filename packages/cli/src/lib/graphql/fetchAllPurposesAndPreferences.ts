import { fetchAllPurposesAndPreferences as sdkFetchAllPurposesAndPreferences } from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';

export type { PurposeWithPreferences } from '@transcend-io/sdk';

/**
 * CLI wrapper — injects logger and preserves the legacy signature.
 *
 * @param client - GraphQL client
 * @returns List of purposes with preference topics
 */
export async function fetchAllPurposesAndPreferences(client: GraphQLClient) {
  return sdkFetchAllPurposesAndPreferences(client, { logger });
}

import { fetchAllPreferenceTopics as sdkFetchAllPreferenceTopics } from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';

export type { PreferenceTopic } from '@transcend-io/sdk';

/**
 * CLI wrapper — injects logger and preserves the legacy signature.
 *
 * @param client - GraphQL client
 * @returns All preference topics in the organization
 */
export async function fetchAllPreferenceTopics(client: GraphQLClient) {
  return sdkFetchAllPreferenceTopics(client, { logger });
}

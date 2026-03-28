import {
  createPreferenceAccessTokens as sdkCreatePreferenceAccessTokens,
  type PreferenceAccessTokenInputWithIndex,
} from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';

export type {
  PreferenceAccessTokenInput,
  PreferenceAccessTokenInputWithIndex,
} from '@transcend-io/sdk';

/**
 * CLI wrapper — injects logger and preserves the legacy signature.
 *
 * @see https://docs.transcend.io/docs/articles/preference-management/access-links
 * @param client - GraphQL
 * @param records - Inputs to sign
 * @param emitProgress - Optional progress emitter
 * @param concurrency - Number of concurrent requests to make (default: 10)
 * @returns list of access tokens/input identifiers
 */
export async function createPreferenceAccessTokens(
  client: GraphQLClient,
  records: PreferenceAccessTokenInputWithIndex[],
  emitProgress?: (progress: number) => void,
  concurrency = 10,
) {
  return sdkCreatePreferenceAccessTokens(client, {
    records,
    logger,
    emitProgress,
    concurrency,
  });
}

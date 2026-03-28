import {
  buildTranscendGraphQLClient,
  fetchAllIdentifiers,
  fetchAllPurposes,
  fetchAllPreferenceTopics,
  type Identifier,
  type PreferenceTopic,
  type Purpose,
} from '@transcend-io/sdk';
import type { GraphQLClient } from 'graphql-request';

import { logger } from '../../../../logger.js';

export type PreferenceUploadReferenceData = {
  /**
   * List of purposes in the organization
   */
  purposes: Purpose[];
  /**
   * List of preference topics in the organization
   */
  preferenceTopics: PreferenceTopic[];
  /**
   * List of identifiers in the organization
   */
  identifiers: Identifier[];
};

/**
 * Load all required reference data for an upload run.
 *
 * @param client - GraphQL client
 * @returns GraphQL client and reference data arrays
 */
export async function loadReferenceData(client: GraphQLClient): Promise<
  {
    /**
     * GraphQL client to use for making requests
     */
    client: ReturnType<typeof buildTranscendGraphQLClient>;
  } & PreferenceUploadReferenceData
> {
  const [purposes, preferenceTopics, identifiers] = await Promise.all([
    fetchAllPurposes(client, { logger }),
    fetchAllPreferenceTopics(client, { logger }),
    fetchAllIdentifiers(client, { logger }),
  ]);
  return { client, purposes, preferenceTopics, identifiers };
}

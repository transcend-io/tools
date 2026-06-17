import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { FETCH_CONSENT_MANAGER_ID } from './gqls/consentManager.js';

/**
 * Fetch consent manager ID
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Consent manager ID in organization
 */
export async function fetchConsentManagerId(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Max number of requests to send */
    maxRequests?: number;
  } = {},
): Promise<string> {
  const {
    consentManager: { consentManager },
  } = await makeGraphQLRequest<{
    /** Consent manager query */
    consentManager: {
      /** Consent manager object */
      consentManager: {
        /** ID of bundle */
        id: string;
      };
    };
  }>(client, FETCH_CONSENT_MANAGER_ID, {
    logger: options.logger,
    maxRetries: options.maxRequests,
  });
  return consentManager.id;
}

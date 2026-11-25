import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  FETCH_CONSENT_MANAGER_DEPLOY_STATE,
  type TranscendCliFetchConsentManagerDeployStateResponse,
  type TranscendConsentManagerDeployStateGql,
} from './gqls/consentManager.js';

/**
 * Fetch the deploy state of the consent manager
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Deploy state, last deploy error, and last deploy time
 */
export async function fetchConsentManagerDeployState(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<TranscendConsentManagerDeployStateGql> {
  const {
    consentManager: { consentManager },
  } = await makeGraphQLRequest<TranscendCliFetchConsentManagerDeployStateResponse>(
    client,
    FETCH_CONSENT_MANAGER_DEPLOY_STATE,
    { logger: options.logger },
  );
  return consentManager;
}

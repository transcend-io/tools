import { ConsentBundleType } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { DEPLOY_CONSENT_MANAGER, UPDATE_CONSENT_MANAGER_TO_LATEST } from './gqls/consentManager.js';

/**
 * Deploy the Consent Manager
 *
 * @param client - GraphQL client
 * @param input - Deploy input
 * @param options - Options
 */
export async function deployConsentManager(
  client: GraphQLClient,
  input: {
    /** ID of Consent Manager */
    id: string;
    /** Type of bundle */
    bundleType: ConsentBundleType;
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  await makeGraphQLRequest(client, DEPLOY_CONSENT_MANAGER, {
    variables: { airgapBundleId: input.id, bundleType: input.bundleType },
    logger: options.logger,
  });
}

/**
 * Update the Consent Manager to the latest airgap.js version
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateConsentManagerToLatest(
  client: GraphQLClient,
  options: {
    /** Consent manager to update */
    input: {
      /** ID of Consent Manager */
      id: string;
      /** Type of bundle */
      bundleType: ConsentBundleType;
    };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { input: consentManager, logger } = options;
  await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_TO_LATEST, {
    variables: { airgapBundleId: consentManager.id, bundleType: consentManager.bundleType },
    logger,
  });
}

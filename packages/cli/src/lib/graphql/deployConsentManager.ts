import { ConsentBundleType } from '@transcend-io/privacy-types';
import {
  DEPLOY_CONSENT_MANAGER,
  makeGraphQLRequest,
  UPDATE_CONSENT_MANAGER_TO_LATEST,
} from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';

/**
 * Deploy the Consent Manager
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function deployConsentManager(
  client: GraphQLClient,
  {
    id,
    bundleType,
  }: {
    /** ID of Consent Manager */
    id: string;
    /** Type of bundle */
    bundleType: ConsentBundleType;
  },
): Promise<void> {
  await makeGraphQLRequest(client, DEPLOY_CONSENT_MANAGER, {
    variables: { airgapBundleId: id, bundleType },
    logger,
  });
}

/**
 * Update the Consent Manager to the latest airgap.jz version
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateConsentManagerToLatest(
  client: GraphQLClient,
  {
    id,
    bundleType,
  }: {
    /** ID of Consent Manager */
    id: string;
    /** Type of bundle */
    bundleType: ConsentBundleType;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_TO_LATEST, {
    variables: { airgapBundleId: id, bundleType },
    logger,
  });
}

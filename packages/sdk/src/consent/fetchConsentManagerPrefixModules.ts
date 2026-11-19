import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  FETCH_AIRGAP_BUNDLE_PREFIX_MODULES,
  type TranscendCliFetchAirgapBundlePrefixModulesResponse,
} from './gqls/prefixModules.js';

const PAGE_SIZE = 50;

/** A prefix module attached to the consent manager bundle */
export interface ConsentManagerPrefixModule {
  /** Name of the module */
  name: string;
  /** Catalog the module comes from: provided by Transcend or owned by the organization */
  catalog: 'transcend' | 'organization';
  /** Version of the module that is attached */
  version: string;
  /** JSON config of the module on this bundle */
  config?: string;
}

/**
 * Fetch the prefix modules attached to a consent manager (airgap bundle)
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Prefix modules on the bundle
 */
export async function fetchConsentManagerPrefixModules(
  client: GraphQLClient,
  options: {
    /** ID of the airgap bundle */
    airgapBundleId: string;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<ConsentManagerPrefixModule[]> {
  const prefixModules: ConsentManagerPrefixModule[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      airgapBundleAirgapPrefixModules: { nodes },
    } = await makeGraphQLRequest<TranscendCliFetchAirgapBundlePrefixModulesResponse>(
      client,
      FETCH_AIRGAP_BUNDLE_PREFIX_MODULES,
      {
        variables: { airgapBundleId: options.airgapBundleId, first: PAGE_SIZE, offset },
        logger: options.logger,
      },
    );
    prefixModules.push(
      ...nodes.map(({ config, airgapPrefixModuleRelease: { version, airgapPrefixModule } }) => ({
        name: airgapPrefixModule.name,
        catalog: airgapPrefixModule.organizationId
          ? ('organization' as const)
          : ('transcend' as const),
        version,
        // Backend returns null when unset; omit from yaml rather than writing null
        config: config || undefined,
      })),
    );
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return prefixModules;
}

import type { IsoCountryCode, IsoCountrySubdivisionCode } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { SILO_DISCOVERY_RESULTS } from './gqls/siloDiscoveryResult.js';

export interface SiloDiscoveryResult {
  /** Title of silo discovery result */
  title?: string;
  /** Resource ID of silo discovery result */
  resourceId: string;
  /** Suggested catalog */
  suggestedCatalog: {
    /** Title for the suggested catalog */
    title: string;
  };
  /** The likelihood that data is sensitive for this results */
  containsSensitiveData: string;
  /** The status of silo discovery triage */
  status: string;
  /** Hosting country of data silo discovery result */
  country?: IsoCountryCode;
  /** Hosting subdivision data silo discovery result */
  countrySubDivision?: IsoCountrySubdivisionCode;
  /** Plaintext context data silo discovery result */
  plaintextContext: string;
  /** The plugin that found this result */
  plugin: {
    /** The data silo the plugin belongs to */
    dataSilo: {
      /** The internal display title */
      title: string;
    };
  };
}

const PAGE_SIZE = 30;

/**
 * Fetch all silo discovery results in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All silo discovery results in the organization
 */
export async function fetchAllSiloDiscoveryResults(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<SiloDiscoveryResult[]> {
  const { logger } = options;
  const siloDiscoveryResults: SiloDiscoveryResult[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      siloDiscoveryResults: { nodes },
    } = await makeGraphQLRequest<{
      /** Discovery results */
      siloDiscoveryResults: {
        /** Nodes */
        nodes: SiloDiscoveryResult[];
      };
    }>(client, SILO_DISCOVERY_RESULTS, {
      variables: { first: PAGE_SIZE, offset, input: {}, filterBy: {} },
      logger,
    });

    const titledNodes = nodes.map((node) =>
      node.title === null && node.suggestedCatalog?.title
        ? { ...node, title: node.suggestedCatalog.title }
        : node,
    );

    siloDiscoveryResults.push(...titledNodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return siloDiscoveryResults;
}

import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { CATALOGS } from './gqls/catalog.js';

export interface Catalog {
  /** Integration name */
  integrationName: string;
  /** Title of Data Silo */
  title: string;
  /** Whether API is supported */
  hasApiFunctionality: boolean;
}

const PAGE_SIZE = 100;

/**
 * Fetch all integration catalogs in an organization
 *
 * @param client - Client
 * @param options - Options
 * @returns Integration catalogs
 */
export async function fetchAllCatalogs(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Catalog[]> {
  const { logger } = options;
  const catalogs: Catalog[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      catalogs: { nodes },
    } = await makeGraphQLRequest<{
      /** integration catalogs */
      catalogs: {
        /** List */
        nodes: Catalog[];
      };
    }>(client, CATALOGS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    catalogs.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);
  return catalogs.sort((a, b) => a.integrationName.localeCompare(b.integrationName));
}

export interface IndexedCatalogs {
  /** Mapping from service name to service title */
  serviceToTitle: { [k in string]: string };
  /** Mapping from service name to boolean indicate if service has API integration support */
  serviceToSupportedIntegration: { [k in string]: boolean };
}

/**
 * Fetch all integration catalogs and index them for usage in common utility manners
 *
 * @param client - Client
 * @param options - Options
 * @returns Integration catalogs
 */
export async function fetchAndIndexCatalogs(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<
  {
    /** List of all catalogs */
    catalogs: Catalog[];
  } & IndexedCatalogs
> {
  const catalogs = await fetchAllCatalogs(client, options);

  const serviceToTitle = catalogs.reduce(
    (acc, catalog) => Object.assign(acc, { [catalog.integrationName]: catalog.title }),
    {} as { [k in string]: string },
  );

  const serviceToSupportedIntegration = catalogs.reduce(
    (acc, catalog) =>
      Object.assign(acc, {
        [catalog.integrationName]: catalog.hasApiFunctionality,
      }),
    {} as { [k in string]: boolean },
  );

  return {
    catalogs,
    serviceToTitle,
    serviceToSupportedIntegration,
  };
}

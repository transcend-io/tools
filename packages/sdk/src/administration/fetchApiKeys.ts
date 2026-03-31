import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy, uniq, difference } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { API_KEYS } from './gqls/apiKey.js';

export interface ApiKey {
  /** ID of API key */
  id: string;
  /** Title of API key */
  title: string;
}

export interface FetchApiKeysInput {
  /** API key definitions */
  'api-keys'?: {
    /** Title of API key */
    title: string;
  }[];
  /** Data silo definitions that may reference API keys */
  'data-silos'?: {
    /** Title of the API key to use */
    'api-key-title'?: string;
  }[];
}

const PAGE_SIZE = 20;

const ADMIN_LINK = 'https://app.transcend.io/infrastructure/api-keys';

/**
 * Fetch all API keys in an organization
 *
 * @param client - Client
 * @param options - Options
 * @returns API keys
 */
export async function fetchAllApiKeys(
  client: GraphQLClient,
  options: {
    /** Filter on titles */
    titles?: string[];
    /** Logger instance */
    logger: Logger;
  },
): Promise<ApiKey[]> {
  const { titles, logger } = options;
  const apiKeys: ApiKey[] = [];
  let offset = 0;

  // Paginate
  let shouldContinue = false;
  do {
    const {
      apiKeys: { nodes },
    } = await makeGraphQLRequest<{
      /** API keys */
      apiKeys: {
        /** List */
        nodes: ApiKey[];
      };
    }>(client, API_KEYS, {
      variables: { first: PAGE_SIZE, offset, titles },
      logger,
    });
    apiKeys.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);
  return apiKeys.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Fetch all apiKeys and if any are found in the config that are
 * missing, create those apiKeys.
 *
 * @param apiKeyInputs - API keys to fetch metadata on
 * @param client - GraphQL client
 * @param fetchAll - When true, fetch all API keys
 * @param options - Options
 * @returns A map from apiKey title to Identifier
 */
export async function fetchApiKeys(
  { 'api-keys': apiKeyInputs = [], 'data-silos': dataSilos = [] }: FetchApiKeysInput,
  client: GraphQLClient,
  fetchAll = false,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<{ [k in string]: ApiKey }> {
  const { logger } = options;
  logger.info(`Fetching ${fetchAll ? 'all' : apiKeyInputs.length} API keys...`);
  const titles = apiKeyInputs.map(({ title }) => title);
  const expectedApiKeyTitles = uniq(
    dataSilos.map((silo) => silo['api-key-title']).filter((x): x is string => !!x),
  );
  const allTitlesExpected = [...expectedApiKeyTitles, ...titles];
  const apiKeys = await fetchAllApiKeys(client, {
    titles: fetchAll ? undefined : [...expectedApiKeyTitles, ...titles],
    logger,
  });

  // Create a map
  const apiKeysByTitle = keyBy(apiKeys, 'title');

  // Determine expected set of apiKeys expected
  const missingApiKeys = difference(
    allTitlesExpected,
    apiKeys.map(({ title }) => title),
  );

  // If there are missing apiKeys, throw an error
  if (missingApiKeys.length > 0) {
    logger.error(
      `Failed to find API keys "${missingApiKeys.join(
        '", "',
      )}"! Make sure these API keys are created at: ${ADMIN_LINK}`,
    );
    process.exit(1);
  }
  return apiKeysByTitle;
}

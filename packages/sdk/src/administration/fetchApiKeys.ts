import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy, uniq, difference } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
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
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: {
      /** Filter on titles */
      titles?: string[];
    };
  },
): Promise<ApiKey[]> {
  const { logger = NOOP_LOGGER, filterBy: { titles } = {} } = options;
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
 * @param client - GraphQL client
 * @param options - Options
 * @returns A map from apiKey title to Identifier
 */
export async function fetchApiKeys(
  client: GraphQLClient,
  options: {
    /** API key input configuration */
    apiKeyInputs?: FetchApiKeysInput;
    /** When true, fetch all API keys */
    fetchAll?: boolean;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<{ [k in string]: ApiKey }> {
  const {
    apiKeyInputs: { 'api-keys': apiKeyDefs = [], 'data-silos': dataSilos = [] } = {},
    fetchAll = false,
    logger = NOOP_LOGGER,
  } = options;
  logger.info(`Fetching ${fetchAll ? 'all' : apiKeyDefs.length} API keys...`);
  const titles = apiKeyDefs.map(({ title }) => title);
  const expectedApiKeyTitles = uniq(
    dataSilos.map((silo) => silo['api-key-title']).filter((x): x is string => !!x),
  );
  const allTitlesExpected = [...expectedApiKeyTitles, ...titles];
  const apiKeys = await fetchAllApiKeys(client, {
    logger,
    filterBy: {
      titles: fetchAll ? undefined : [...expectedApiKeyTitles, ...titles],
    },
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

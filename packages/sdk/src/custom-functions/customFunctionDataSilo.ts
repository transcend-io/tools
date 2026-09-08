import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { CREATE_CUSTOM_FUNCTION_DATA_SILO, DELETE_DATA_SILOS } from './gqls/index.js';

/**
 * The integration/catalog name for custom function DSR integrations. Silos
 * created with this catalog get `customSiloConnectionStrategy =
 * CUSTOM_FUNCTION` and start `NOT_CONFIGURED` until a custom function is
 * attached — the same shell the Admin Dashboard creates for a new DSR
 * function.
 */
export const CUSTOM_FUNCTION_INTEGRATION_NAME = 'customFunction';

/**
 * A newly created custom function data silo (DSR integration).
 */
export interface CustomFunctionDataSilo {
  /** Data silo ID */
  id: string;
  /** Data silo title */
  title: string;
}

/**
 * Create the data silo (DSR integration) backing a new DSR custom function.
 *
 * The silo is an inert `customFunction`-catalog shell: it has no function
 * attached yet and stays `NOT_CONFIGURED` until `createCustomFunction` links
 * one (which flips it to `Connected`). The `customFunction` catalog requires
 * a Sombra gateway on create — the function's code runs on that gateway.
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param options - Options
 * @returns The created data silo
 */
export async function createCustomFunctionDataSilo(
  client: GraphQLClient,
  options: {
    /** Title of the integration (conventionally the custom function name) */
    title: string;
    /** The Sombra gateway the function belongs to */
    sombraId: string;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<CustomFunctionDataSilo> {
  const { title, sombraId, logger = NOOP_LOGGER } = options;
  const {
    createDataSilos: { dataSilos },
  } = await makeGraphQLRequest<{
    /** Mutation response */
    createDataSilos: {
      /** The created data silos */
      dataSilos: CustomFunctionDataSilo[];
    };
  }>(client, CREATE_CUSTOM_FUNCTION_DATA_SILO, {
    variables: {
      input: [
        {
          name: CUSTOM_FUNCTION_INTEGRATION_NAME,
          title,
          sombraId,
        },
      ],
    },
    logger,
  });
  const [dataSilo] = dataSilos;
  if (!dataSilo) {
    throw new Error(`Failed to create a custom function data silo titled "${title}".`);
  }
  return dataSilo;
}

/**
 * Delete a data silo. Used to roll back a just-created custom function data
 * silo when the function's test run fails before anything was linked to it.
 *
 * @param client - GraphQL client authenticated with a Transcend API key
 * @param dataSiloId - The data silo ID to delete
 * @param options - Options
 */
export async function deleteDataSilo(
  client: GraphQLClient,
  dataSiloId: string,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, DELETE_DATA_SILOS, {
    variables: {
      input: { ids: [dataSiloId] },
    },
    logger,
  });
}

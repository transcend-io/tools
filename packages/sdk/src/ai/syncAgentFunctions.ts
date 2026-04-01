import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import type { JSONSchema7 } from 'json-schema';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllAgentFunctions, AgentFunction } from './fetchAllAgentFunctions.js';
import { UPDATE_AGENT_FUNCTIONS, CREATE_AGENT_FUNCTION } from './gqls/agentFunction.js';

export interface AgentFunctionInput {
  /** Name of the agent function */
  name: string;
  /** Description of the agent function */
  description: string;
  /** The JSON schema parameters (string or parsed) */
  parameters: JSONSchema7 | string;
}

/**
 * Create a new agent function
 *
 * @param client - GraphQL client
 * @param agentFunction - Input
 * @param options - Options
 * @returns Created agent function
 */
export async function createAgentFunction(
  client: GraphQLClient,
  agentFunction: AgentFunctionInput,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Pick<AgentFunction, 'id' | 'name'>> {
  const { logger } = options;
  const input = {
    name: agentFunction.name,
    description: agentFunction.description,
    parameters: agentFunction.parameters,
    agentIds: [],
    // TODO: https://transcend.height.app/T-31994 - sync agents
  };

  const { createAgentFunction } = await makeGraphQLRequest<{
    /** Create agent function mutation */
    createAgentFunction: {
      /** Created agent function */
      agentFunction: AgentFunction;
    };
  }>(client, CREATE_AGENT_FUNCTION, {
    variables: { input },
    logger,
  });
  return createAgentFunction.agentFunction;
}

/**
 * Update agent functions
 *
 * @param client - GraphQL client
 * @param agentFunctionIdPairs - [AgentFunctionInput, agentFunctionId] list
 * @param options - Options
 */
export async function updateAgentFunctions(
  client: GraphQLClient,
  agentFunctionIdPairs: [AgentFunctionInput, string][],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  await makeGraphQLRequest(client, UPDATE_AGENT_FUNCTIONS, {
    variables: {
      input: {
        agentFunctions: agentFunctionIdPairs.map(([agentFunction, id]) => ({
          id,
          name: agentFunction.name,
          description: agentFunction.description,
          parameters: agentFunction.parameters,
        })),
      },
    },
    logger,
  });
}

/**
 * Sync the agent functions
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncAgentFunctions(
  client: GraphQLClient,
  inputs: AgentFunctionInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  logger.info(`Syncing "${inputs.length}" agent functions...`);

  let encounteredError = false;

  const existingAgentFunctions = await fetchAllAgentFunctions(client, { logger });

  const agentFunctionByName = keyBy(existingAgentFunctions, 'name') as {
    [k in string]: Pick<AgentFunction, 'id' | 'name'>;
  };

  const newAgentFunctions = inputs.filter((input) => !agentFunctionByName[input.name]);

  await mapSeries(newAgentFunctions, async (agentFunction) => {
    try {
      const newAgentFunction = await createAgentFunction(client, agentFunction, { logger });
      agentFunctionByName[newAgentFunction.name] = newAgentFunction;
      logger.info(`Successfully synced agent function "${agentFunction.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to sync agent function "${agentFunction.name}"! - ${(err as Error).message}`,
      );
    }
  });

  try {
    logger.info(`Updating "${inputs.length}" agent functions!`);
    await updateAgentFunctions(
      client,
      inputs.map((input) => [input, agentFunctionByName[input.name]!.id]),
      { logger },
    );
    logger.info(`Successfully synced "${inputs.length}" agent functions!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to sync "${inputs.length}" agent functions! - ${(err as Error).message}`);
  }

  return !encounteredError;
}

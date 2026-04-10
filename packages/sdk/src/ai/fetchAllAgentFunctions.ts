import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import type { JSONSchema7 } from 'json-schema';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { AGENT_FUNCTIONS } from './gqls/agentFunction.js';

export interface AgentFunction {
  /** ID of agentFunction */
  id: string;
  /** Name of agentFunction */
  name: string;
  /** Description of the agentFunction */
  description: string;
  /** The JSON schema */
  parameters: JSONSchema7;
}

interface AgentFunctionRaw extends Omit<AgentFunction, 'parameters'> {
  /** Stringified parameters */
  parameters: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all agent functions in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All agent functions in the organization
 */
export async function fetchAllAgentFunctions(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<AgentFunction[]> {
  const { logger } = options;
  const agentFunctions: AgentFunction[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      agentFunctions: { nodes },
    } = await makeGraphQLRequest<{
      /** AgentFunctions */
      agentFunctions: {
        /** List */
        nodes: AgentFunctionRaw[];
      };
    }>(client, AGENT_FUNCTIONS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    agentFunctions.push(
      ...nodes.map((node) => ({
        ...node,
        parameters: JSON.parse(node.parameters),
      })),
    );
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return agentFunctions.sort((a, b) => a.name.localeCompare(b.name));
}

import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';
import type { JSONSchema7 } from 'json-schema';

import { logger } from '../../logger.js';
import { AGENT_FUNCTIONS } from './gqls/index.js';

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

interface AgentFunctionInput extends Omit<AgentFunction, 'parameters'> {
  /** Stringified parameters */
  parameters: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all agentFunctions in the organization
 *
 * @param client - GraphQL client
 * @returns All agentFunctions in the organization
 */
export async function fetchAllAgentFunctions(client: GraphQLClient): Promise<AgentFunction[]> {
  const agentFunctions: AgentFunction[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      agentFunctions: { nodes },
    } = await makeGraphQLRequest<{
      /** AgentFunctions */
      agentFunctions: {
        /** List */
        nodes: AgentFunctionInput[];
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

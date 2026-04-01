import { LargeLanguageModelClient } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllAgents, Agent } from './fetchAllAgents.js';
import { UPDATE_AGENTS, CREATE_AGENT } from './gqls/agent.js';

export interface AgentInput {
  /** Name of the agent */
  name: string;
  /** Description of the agent */
  description?: string;
  /** Whether the agent has code interpreter enabled */
  codeInterpreterEnabled?: boolean;
  /** Whether the agent has retrieval enabled */
  retrievalEnabled?: boolean;
  /** The prompt title */
  prompt?: string;
  /** Large language model config */
  'large-language-model': {
    /** Name of model */
    name: string;
    /** Client */
    client: LargeLanguageModelClient;
  };
}

/**
 * Create a new agent
 *
 * @param client - GraphQL client
 * @param agent - Input
 * @param options - Options
 * @returns Created agent
 */
export async function createAgent(
  client: GraphQLClient,
  agent: AgentInput,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Pick<Agent, 'id' | 'name' | 'agentId'>> {
  const { logger } = options;
  const input = {
    name: agent.name,
    description: agent.description,
    codeInterpreterEnabled: agent.codeInterpreterEnabled,
    retrievalEnabled: agent.retrievalEnabled,
    promptTitle: agent.prompt,
    largeLanguageModelName: agent['large-language-model'].name,
    largeLanguageModelClient: agent['large-language-model'].client,
    // TODO: https://transcend.height.app/T-32760 - agentFunction, agentFile
    // TODO: https://transcend.height.app/T-31994 - owners and teams
  };

  const { createAgent } = await makeGraphQLRequest<{
    /** Create agent mutation */
    createAgent: {
      /** Created agent */
      agent: Agent;
    };
  }>(client, CREATE_AGENT, {
    variables: { input },
    logger,
  });
  return createAgent.agent;
}

/**
 * Update agents
 *
 * @param client - GraphQL client
 * @param agentIdPairs - [AgentInput, agentId] list
 * @param options - Options
 */
export async function updateAgents(
  client: GraphQLClient,
  agentIdPairs: [AgentInput, string][],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  await makeGraphQLRequest(client, UPDATE_AGENTS, {
    variables: {
      input: {
        agents: agentIdPairs.map(([agent, id]) => ({
          id,
          name: agent.name,
          description: agent.description,
          codeInterpreterEnabled: agent.codeInterpreterEnabled,
          retrievalEnabled: agent.retrievalEnabled,
          // TODO: https://transcend.height.app/T-31995 - prompt, largeLanguageModel, agentFunction, agentFile
        })),
      },
    },
    logger,
  });
}

/**
 * Sync the agents
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncAgents(
  client: GraphQLClient,
  inputs: AgentInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  logger.info(`Syncing "${inputs.length}" agents...`);

  let encounteredError = false;

  const existingAgents = await fetchAllAgents(client, { logger });

  const agentByName = keyBy(existingAgents, 'name') as {
    [k in string]: Pick<Agent, 'id' | 'name' | 'agentId'>;
  };

  const newAgents = inputs.filter((input) => !agentByName[input.name]);

  await mapSeries(newAgents, async (agent) => {
    try {
      const newAgent = await createAgent(client, agent, { logger });
      agentByName[newAgent.name] = newAgent;
      logger.info(`Successfully synced agent "${agent.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to sync agent "${agent.name}"! - ${(err as Error).message}`);
    }
  });

  try {
    logger.info(`Updating "${inputs.length}" agents!`);
    await updateAgents(
      client,
      inputs.map((input) => [input, agentByName[input.name]!.id]),
      { logger },
    );
    logger.info(`Successfully synced "${inputs.length}" agents!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to sync "${inputs.length}" agents! - ${(err as Error).message}`);
  }

  return !encounteredError;
}

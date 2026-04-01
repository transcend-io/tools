import { makeGraphQLRequest } from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { AgentInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { fetchAllAgents, Agent } from './fetchAllAgents.js';
import { UPDATE_AGENTS, CREATE_AGENT } from './gqls/index.js';

/**
 * Input to create a new agent
 *
 * @param client - GraphQL client
 * @param agent - Input
 * @returns Created agent
 */
export async function createAgent(
  client: GraphQLClient,
  agent: AgentInput,
): Promise<Pick<Agent, 'id' | 'name' | 'agentId'>> {
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
 * Input to update agents
 *
 * @param client - GraphQL client
 * @param agentIdParis - [AgentInput, agentId] list
 */
export async function updateAgents(
  client: GraphQLClient,
  agentIdParis: [AgentInput, string][],
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_AGENTS, {
    variables: {
      input: {
        agents: agentIdParis.map(([agent, id]) => ({
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
 * Sync the data inventory agents
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncAgents(client: GraphQLClient, inputs: AgentInput[]): Promise<boolean> {
  // Fetch existing
  logger.info(colors.magenta(`Syncing "${inputs.length}" agents...`));

  let encounteredError = false;

  // Fetch existing
  const existingAgents = await fetchAllAgents(client);

  // Look up by name
  const agentByName: {
    [k in string]: Pick<Agent, 'id' | 'name' | 'agentId'>;
  } = keyBy(existingAgents, 'name');

  // Create new agents
  const newAgents = inputs.filter((input) => !agentByName[input.name]);

  // Create new agents
  await mapSeries(newAgents, async (agent) => {
    try {
      const newAgent = await createAgent(client, agent);
      agentByName[newAgent.name] = newAgent;
      logger.info(colors.green(`Successfully synced agent "${agent.name}"!`));
    } catch (err) {
      encounteredError = true;
      logger.error(colors.red(`Failed to sync agent "${agent.name}"! - ${err.message}`));
    }
  });

  // Update all agents
  try {
    logger.info(colors.magenta(`Updating "${inputs.length}" agents!`));
    await updateAgents(
      client,
      inputs.map((input) => [input, agentByName[input.name].id]),
    );
    logger.info(colors.green(`Successfully synced "${inputs.length}" agents!`));
  } catch (err) {
    encounteredError = true;
    logger.error(colors.red(`Failed to sync "${inputs.length}" agents ! - ${err.message}`));
  }

  return !encounteredError;
}

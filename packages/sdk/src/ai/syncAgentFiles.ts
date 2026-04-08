import { PromptFilePurpose } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllAgentFiles, AgentFile } from './fetchAllAgentFiles.js';
import { UPDATE_AGENT_FILES, CREATE_AGENT_FILE } from './gqls/agentFile.js';

export interface AgentFileInput {
  /** Name of the agent file */
  name: string;
  /** Description of the agent file */
  description?: string;
  /** File ID */
  fileId: string;
  /** File size */
  size: number;
  /** File purpose */
  purpose: PromptFilePurpose;
}

/**
 * Create a new agent file
 *
 * @param client - GraphQL client
 * @param agentFile - Input
 * @param options - Options
 * @returns Created agent file
 */
export async function createAgentFile(
  client: GraphQLClient,
  options: {
    /** Agent file to create */
    input: AgentFileInput;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Pick<AgentFile, 'id' | 'name' | 'fileId'>> {
  const { input: agentFile, logger = NOOP_LOGGER } = options;
  const input = {
    name: agentFile.name,
    description: agentFile.description,
    fileId: agentFile.fileId,
    size: agentFile.size,
    purpose: agentFile.purpose,
    fileUploadedAt: new Date(),
    agentIds: [],
    // TODO: https://transcend.height.app/T-31994 - sync agents
  };

  const { createAgentFile } = await makeGraphQLRequest<{
    /** Create agent file mutation */
    createAgentFile: {
      /** Created agent file */
      agentFile: AgentFile;
    };
  }>(client, CREATE_AGENT_FILE, {
    variables: { input },
    logger,
  });
  return createAgentFile.agentFile;
}

/**
 * Update agent files
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateAgentFiles(
  client: GraphQLClient,
  options: {
    /** [AgentFileInput, agentFileId] list */
    input: [AgentFileInput, string][];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { input: agentFiles, logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_AGENT_FILES, {
    variables: {
      input: {
        agentFiles: agentFiles.map(([agentFile, id]) => ({
          id,
          name: agentFile.name,
          description: agentFile.description,
          fileId: agentFile.fileId,
          size: agentFile.size,
          purpose: agentFile.purpose,
        })),
      },
    },
    logger,
  });
}

/**
 * Sync the agent files
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncAgentFiles(
  client: GraphQLClient,
  inputs: AgentFileInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  logger.info(`Syncing "${inputs.length}" agent files...`);

  let encounteredError = false;

  const existingAgentFiles = await fetchAllAgentFiles(client, { logger });

  const agentFileByName = keyBy(existingAgentFiles, 'name') as {
    [k in string]: Pick<AgentFile, 'id' | 'name' | 'fileId'>;
  };

  const newAgentFiles = inputs.filter((input) => !agentFileByName[input.name]);

  await mapSeries(newAgentFiles, async (agentFile) => {
    try {
      const newAgentFile = await createAgentFile(client, { input: agentFile, logger });
      agentFileByName[newAgentFile.name] = newAgentFile;
      logger.info(`Successfully synced agent file "${agentFile.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to sync agent file "${agentFile.name}"! - ${(err as Error).message}`);
    }
  });

  try {
    logger.info(`Updating "${inputs.length}" agent files!`);
    await updateAgentFiles(client, {
      input: inputs.map((input) => [input, agentFileByName[input.name]!.id]),
      logger,
    });
    logger.info(`Successfully synced "${inputs.length}" agent files!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to sync "${inputs.length}" agent files! - ${(err as Error).message}`);
  }

  return !encounteredError;
}

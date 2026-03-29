import { PromptFilePurpose } from '@transcend-io/privacy-types';
import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';
import { AGENT_FILES } from './gqls/index.js';

export interface AgentFile {
  /** ID of agentFile */
  id: string;
  /** Name of agentFile */
  name: string;
  /** Description of the agentFile */
  description: string;
  /** Initial file name, useful to track if a file was split into multiple chunks */
  initialFileName?: string;
  /** File ID */
  fileId: string;
  /** File size */
  size: number;
  /** File purpose */
  purpose: PromptFilePurpose;
}

const PAGE_SIZE = 20;

export interface AgentFileFilterBy {
  /** Filter by remote file IDs */
  fileIds?: string[];
  /** Filter by file names */
  names?: string[];
  /** Filter by initial file names (when split into chunks) */
  initialFileNames?: string[];
}

/**
 * Fetch all agentFiles in the organization
 *
 * @param client - GraphQL client
 * @param filterBy - Filter by options
 * @returns All agentFiles in the organization
 */
export async function fetchAllAgentFiles(
  client: GraphQLClient,
  filterBy: AgentFileFilterBy = {},
): Promise<AgentFile[]> {
  const agentFiles: AgentFile[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      agentFiles: { nodes },
    } = await makeGraphQLRequest<{
      /** AgentFiles */
      agentFiles: {
        /** List */
        nodes: AgentFile[];
      };
    }>(client, AGENT_FILES, {
      variables: { first: PAGE_SIZE, offset, filterBy },
      logger,
    });
    agentFiles.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return agentFiles.sort((a, b) => a.name.localeCompare(b.name));
}

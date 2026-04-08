import { PromptFilePurpose } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { AGENT_FILES } from './gqls/agentFile.js';

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

export interface AgentFileFilterBy {
  /** Filter by remote file IDs */
  fileIds?: string[];
  /** Filter by file names */
  names?: string[];
  /** Filter by initial file names (when split into chunks) */
  initialFileNames?: string[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all agent files in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All agent files in the organization
 */
export async function fetchAllAgentFiles(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter by */
    filterBy?: AgentFileFilterBy;
  },
): Promise<AgentFile[]> {
  const { logger, filterBy = {} } = options;
  const agentFiles: AgentFile[] = [];
  let offset = 0;

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

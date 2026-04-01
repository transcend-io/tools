import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { PROMPT_THREADS } from './gqls/promptThread.js';

export interface PromptThread {
  /** ID of prompts */
  id: string;
  /** Thread ID from API */
  threadId: string;
  /** Related slack message TS */
  slackMessageTs?: string;
  /** Related slack message team ID */
  slackTeamId?: string;
  /** Related slack channel ID */
  slackChannelId?: string;
  /** Related slack channel name */
  slackChannelName?: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all PromptThreads in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All PromptThreads in the organization
 */
export async function fetchAllPromptThreads(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
    /** Filter options */
    filterBy: {
      /** Thread IDs to filter on */
      threadIds?: string[];
      /** Slack message timestamps to filter on */
      slackMessageTs?: string[];
    };
  },
): Promise<PromptThread[]> {
  const { logger, filterBy } = options;
  const promptThreads: PromptThread[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      promptThreads: { nodes },
    } = await makeGraphQLRequest<{
      /** PromptThreads */
      promptThreads: {
        /** List */
        nodes: PromptThread[];
      };
    }>(client, PROMPT_THREADS, {
      variables: { first: PAGE_SIZE, offset, filterBy },
      logger,
    });
    promptThreads.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return promptThreads.sort((a, b) => a.threadId.localeCompare(b.threadId));
}

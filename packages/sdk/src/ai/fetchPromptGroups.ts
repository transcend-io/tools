import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { PROMPT_GROUPS } from './gqls/prompt.js';

export interface PromptGroup {
  /** ID of prompts */
  id: string;
  /** The title of the prompt group. */
  title: string;
  /** The description of the prompt group. */
  description: string;
  /** Prompts in the group */
  prompts: {
    /** Title of prompt */
    title: string;
  }[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all PromptGroups in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All PromptGroups in the organization
 */
export async function fetchAllPromptGroups(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<PromptGroup[]> {
  const { logger } = options;
  const promptGroups: PromptGroup[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      promptGroups: { nodes },
    } = await makeGraphQLRequest<{
      /** PromptGroups */
      promptGroups: {
        /** List */
        nodes: PromptGroup[];
      };
    }>(client, PROMPT_GROUPS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    promptGroups.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return promptGroups.sort((a, b) => a.title.localeCompare(b.title));
}

import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';
import { PROMPT_PARTIALS } from './gqls/index.js';

export interface PromptPartial {
  /** ID of prompts */
  id: string;
  /** The title of the prompt partial. */
  title: string;
  /** The content of the prompt partial. */
  content: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all PromptPartials in the organization
 *
 * @param client - GraphQL client
 * @returns All PromptPartials in the organization
 */
export async function fetchAllPromptPartials(client: GraphQLClient): Promise<PromptPartial[]> {
  const promptPartials: PromptPartial[] = [];
  let offset = 0;

  // Whether to continue looping
  let shouldContinue = false;
  do {
    const {
      promptPartials: { nodes },
    } = await makeGraphQLRequest<{
      /** PromptPartials */
      promptPartials: {
        /** List */
        nodes: PromptPartial[];
      };
    }>(client, PROMPT_PARTIALS, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    promptPartials.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return promptPartials.sort((a, b) => a.title.localeCompare(b.title));
}

import { map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllPrompts } from './fetchPrompts.js';
import { UPDATE_PROMPTS, CREATE_PROMPT } from './gqls/prompt.js';

export interface PromptInput {
  /** Title of prompt */
  title: string;
  /** Prompt content */
  content: string;
  /** Status */
  status?: string;
  /** Temperature */
  temperature?: number;
  /** Top P */
  topP?: number;
  /** Max tokens to sample */
  maxTokensToSample?: number;
}

/**
 * Create a new prompt
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @param options - Options
 * @returns Prompt ID
 */
export async function createPrompt(
  client: GraphQLClient,
  input: {
    /** Title of prompt */
    title: string;
    /** Prompt content */
    content: string;
  },
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<string> {
  const { logger } = options;
  const {
    createPrompt: { prompt },
  } = await makeGraphQLRequest<{
    /** createPrompt mutation */
    createPrompt: {
      /** Prompt */
      prompt: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PROMPT, {
    // TODO: https://transcend.height.app/T-31994 - include models and groups, teams, users
    variables: { input },
    logger,
  });
  logger.info(`Successfully created prompt "${input.title}"!`);
  return prompt.id;
}

/**
 * Update a set of existing prompts
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @param options - Options
 */
export async function updatePrompts(
  client: GraphQLClient,
  input: [PromptInput, string][],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  await makeGraphQLRequest(client, UPDATE_PROMPTS, {
    variables: {
      input: {
        prompts: input.map(([input, id]) => ({
          ...input,
          id,
        })),
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${input.length} prompts!`);
}

/**
 * Sync the prompts
 *
 * @param client - GraphQL client
 * @param prompts - Prompts
 * @param options - Options
 * @returns True if synced successfully
 */
export async function syncPrompts(
  client: GraphQLClient,
  prompts: PromptInput[],
  options: {
    /** Logger instance */
    logger: Logger;
    /** Concurrency */
    concurrency?: number;
  },
): Promise<boolean> {
  const { logger, concurrency = 20 } = options;
  let encounteredError = false;
  logger.info(`Syncing "${prompts.length}" prompts...`);

  // Index existing prompts
  const existing = await fetchAllPrompts(client, { logger });
  const promptByTitle = keyBy(existing, 'title');

  // Determine which prompts are new vs existing
  const mapPromptsToExisting = prompts.map((promptInput) => [
    promptInput,
    promptByTitle[promptInput.title]?.id,
  ]);

  // Create the new prompts
  const newPrompts = mapPromptsToExisting
    .filter(([, existing]) => !existing)
    .map(([promptInput]) => promptInput as PromptInput);
  try {
    logger.info(`Creating "${newPrompts.length}" new prompts...`);
    await map(
      newPrompts,
      async (prompt) => {
        await createPrompt(client, prompt, { logger });
      },
      {
        concurrency,
      },
    );
    logger.info(`Successfully synced ${newPrompts.length} prompts!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create prompts! - ${(err as Error).message}`);
  }

  // Update existing prompts
  const existingPrompts = mapPromptsToExisting.filter((x): x is [PromptInput, string] => !!x[1]);
  try {
    logger.info(`Updating "${existingPrompts.length}" prompts...`);
    await updatePrompts(client, existingPrompts, { logger });
    logger.info(`Successfully updated "${existingPrompts.length}" prompts!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create prompts! - ${(err as Error).message}`);
  }

  logger.info(`Synced "${prompts.length}" prompts!`);

  return !encounteredError;
}

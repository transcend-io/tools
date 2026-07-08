import { map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
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
  options: {
    /** Prompt to create */
    input: {
      /** Title of prompt */
      title: string;
      /** Prompt content */
      content: string;
    };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<string> {
  const { input, logger = NOOP_LOGGER } = options;
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
 * @param options - Options
 */
export async function updatePrompts(
  client: GraphQLClient,
  options: {
    /** [PromptInput, promptId] list */
    input: [PromptInput, string][];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { input: prompts, logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_PROMPTS, {
    variables: {
      input: {
        prompts: prompts.map(([prompt, id]) => ({
          ...prompt,
          id,
        })),
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${prompts.length} prompts!`);
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
    logger?: Logger;
    /** Concurrency */
    concurrency?: number;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER, concurrency = 20 } = options;
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
        await createPrompt(client, { input: prompt, logger });
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
    await updatePrompts(client, { input: existingPrompts, logger });
    logger.info(`Successfully updated "${existingPrompts.length}" prompts!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create prompts! - ${(err as Error).message}`);
  }

  logger.info(`Synced "${prompts.length}" prompts!`);

  return !encounteredError;
}

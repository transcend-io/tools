import { map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllPromptPartials } from './fetchPromptPartials.js';
import { UPDATE_PROMPT_PARTIALS, CREATE_PROMPT_PARTIAL } from './gqls/prompt.js';

export interface PromptPartialInput {
  /** Title of prompt partial */
  title: string;
  /** Prompt partial content */
  content: string;
}

/**
 * Create a new prompt partial
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @param options - Options
 * @returns Prompt partial ID
 */
export async function createPromptPartial(
  client: GraphQLClient,
  input: {
    /** Title of prompt partial */
    title: string;
    /** Prompt content */
    content: string;
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<string> {
  const { logger = NOOP_LOGGER } = options;
  const {
    createPromptPartial: { promptPartial },
  } = await makeGraphQLRequest<{
    /** createPromptPartial mutation */
    createPromptPartial: {
      /** Prompt partial */
      promptPartial: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PROMPT_PARTIAL, {
    variables: { input },
    logger,
  });
  logger.info(`Successfully created prompt partial "${input.title}"!`);
  return promptPartial.id;
}

/**
 * Update a set of existing prompt partials
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @param options - Options
 */
export async function updatePromptPartials(
  client: GraphQLClient,
  input: [PromptPartialInput, string][],
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_PROMPT_PARTIALS, {
    variables: {
      input: {
        promptPartials: input.map(([input, id]) => ({
          ...input,
          id,
        })),
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${input.length} prompt partials!`);
}

/**
 * Sync the prompt partials
 *
 * @param client - GraphQL client
 * @param promptPartials - PromptPartials
 * @param options - Options
 * @returns True if synced successfully
 */
export async function syncPromptPartials(
  client: GraphQLClient,
  promptPartials: PromptPartialInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Concurrency */
    concurrency?: number;
  },
): Promise<boolean> {
  const { logger = NOOP_LOGGER, concurrency = 20 } = options;
  let encounteredError = false;
  logger.info(`Syncing "${promptPartials.length}" prompt partials...`);

  // Index existing prompt partials
  const existing = await fetchAllPromptPartials(client, { logger });
  const promptPartialByTitle = keyBy(existing, 'title');

  // Determine which promptPartials are new vs existing
  const mapPromptPartialsToExisting = promptPartials.map((promptInput) => [
    promptInput,
    promptPartialByTitle[promptInput.title]?.id,
  ]);

  // Create the new promptPartials
  const newPromptPartials = mapPromptPartialsToExisting
    .filter(([, existing]) => !existing)
    .map(([promptInput]) => promptInput as PromptPartialInput);
  try {
    logger.info(`Creating "${newPromptPartials.length}" new prompt partials...`);
    await map(
      newPromptPartials,
      async (prompt) => {
        await createPromptPartial(client, prompt, { logger });
      },
      {
        concurrency,
      },
    );
    logger.info(`Successfully synced ${newPromptPartials.length} prompt partials!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create prompt partials! - ${(err as Error).message}`);
  }

  // Update existing promptPartials
  const existingPromptPartials = mapPromptPartialsToExisting.filter(
    (x): x is [PromptPartialInput, string] => !!x[1],
  );
  try {
    logger.info(`Updating "${existingPromptPartials.length}" prompt partials...`);
    await updatePromptPartials(client, existingPromptPartials, { logger });
    logger.info(`Successfully updated "${existingPromptPartials.length}" prompt partials!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create prompt partials! - ${(err as Error).message}`);
  }

  logger.info(`Synced "${promptPartials.length}" prompt partials!`);

  return !encounteredError;
}

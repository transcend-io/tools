import { map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllPromptGroups } from './fetchPromptGroups.js';
import { fetchAllPrompts } from './fetchPrompts.js';
import { UPDATE_PROMPT_GROUPS, CREATE_PROMPT_GROUP } from './gqls/prompt.js';

export interface PromptGroupInput {
  /** Title of prompt group */
  title: string;
  /** Description */
  description: string;
  /** Prompt titles */
  prompts: string[];
}

export interface EditPromptGroupInput {
  /** Title of prompt group */
  title: string;
  /** Prompt group description */
  description: string;
  /** Prompt IDs */
  promptIds: string[];
}

/**
 * Create a new prompt group
 *
 * @param client - GraphQL client
 * @param input - Prompt input
 * @param options - Options
 * @returns Prompt group ID
 */
export async function createPromptGroup(
  client: GraphQLClient,
  options: {
    /** Prompt group to create */
    input: EditPromptGroupInput;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<string> {
  const { input, logger = NOOP_LOGGER } = options;
  const {
    createPromptGroup: { promptGroup },
  } = await makeGraphQLRequest<{
    /** createPromptGroup mutation */
    createPromptGroup: {
      /** Prompt group */
      promptGroup: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PROMPT_GROUP, {
    variables: { input },
    logger,
  });
  logger.info(`Successfully created prompt group "${input.title}"!`);
  return promptGroup.id;
}

/**
 * Update a set of existing prompt groups
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updatePromptGroups(
  client: GraphQLClient,
  options: {
    /** [EditPromptGroupInput, promptGroupId] list */
    input: [EditPromptGroupInput, string][];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { input: promptGroups, logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_PROMPT_GROUPS, {
    variables: {
      input: {
        promptGroups: promptGroups.map(([promptGroup, id]) => ({
          ...promptGroup,
          id,
        })),
      },
    },
    logger,
  });
  logger.info(`Successfully updated ${promptGroups.length} prompt groups!`);
}

/**
 * Sync the prompt groups
 *
 * @param client - GraphQL client
 * @param promptGroups - PromptGroups
 * @param options - Options
 * @returns True if synced successfully
 */
export async function syncPromptGroups(
  client: GraphQLClient,
  promptGroups: PromptGroupInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Concurrency */
    concurrency?: number;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER, concurrency = 20 } = options;
  let encounteredError = false;
  logger.info(`Syncing "${promptGroups.length}" prompt groups...`);

  // Index existing prompt groups
  const existing = await fetchAllPromptGroups(client, { logger });
  const existingPrompts = await fetchAllPrompts(client, { logger });
  const promptByTitle = keyBy(existingPrompts, 'title');
  const promptGroupByTitle = keyBy(existing, 'title');

  // Determine which promptGroups are new vs existing
  const mapPromptGroupsToExisting = promptGroups.map((promptInput) => [
    promptInput,
    promptGroupByTitle[promptInput.title]?.id,
  ]);

  // Create the new promptGroups
  const newPromptGroups = mapPromptGroupsToExisting
    .filter(([, existing]) => !existing)
    .map(([promptInput]) => promptInput as PromptGroupInput);
  try {
    logger.info(`Creating "${newPromptGroups.length}" new prompt groups...`);
    await map(
      newPromptGroups,
      async (prompt) => {
        await createPromptGroup(client, {
          input: {
            ...prompt,
            promptIds: prompt.prompts.map((title) => {
              const prompt = promptByTitle[title];
              if (!prompt) {
                throw new Error(`Failed to find prompt with title: "${title}"`);
              }
              return prompt.id;
            }),
          },
          logger,
        });
      },
      {
        concurrency,
      },
    );
    logger.info(`Successfully synced ${newPromptGroups.length} prompt groups!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create prompt groups! - ${(err as Error).message}`);
  }

  // Update existing promptGroups
  const existingPromptGroupsMapped = mapPromptGroupsToExisting.filter(
    (x): x is [PromptGroupInput, string] => !!x[1],
  );
  try {
    logger.info(`Updating "${existingPromptGroupsMapped.length}" prompt groups...`);
    await updatePromptGroups(client, {
      input: existingPromptGroupsMapped.map(([{ prompts, ...input }, id]) => [
        {
          ...input,
          promptIds: prompts.map((title) => {
            const prompt = promptByTitle[title];
            if (!prompt) {
              throw new Error(`Failed to find prompt with title: "${title}"`);
            }
            return prompt.id;
          }),
        },
        id,
      ]),
      logger,
    });
    logger.info(`Successfully updated "${existingPromptGroupsMapped.length}" prompt groups!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create prompt groups! - ${(err as Error).message}`);
  }

  logger.info(`Synced "${promptGroups.length}" prompt groups!`);

  return !encounteredError;
}

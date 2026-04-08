import { ProcessingPurpose } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import {
  fetchAllProcessingPurposes,
  ProcessingPurposeSubCategory,
} from './fetchAllProcessingPurposes.js';
import {
  UPDATE_PROCESSING_PURPOSE_SUB_CATEGORIES,
  CREATE_PROCESSING_PURPOSE_SUB_CATEGORY,
} from './gqls/processingPurpose.js';

export interface ProcessingPurposeInput {
  /** Name of processing purpose */
  name: string;
  /** Type of processing purpose */
  purpose: ProcessingPurpose;
  /** Description of processing purpose */
  description?: string;
  /** Owner email addresses */
  owners?: string[];
  /** Team names */
  teams?: string[];
  /** Attribute key-value pairs */
  attributes?: {
    /** Attribute key */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
}

/**
 * Input to create a new processing purpose
 *
 * @param client - GraphQL client
 * @param processingPurpose - Input
 * @param options - Options
 * @returns Created processing purpose
 */
export async function createProcessingPurpose(
  client: GraphQLClient,
  processingPurpose: ProcessingPurposeInput,
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Pick<ProcessingPurposeSubCategory, 'id' | 'name' | 'purpose'>> {
  const input = {
    name: processingPurpose.name,
    purpose: processingPurpose.purpose,
    description: processingPurpose.description,
    // TODO: https://transcend.height.app/T-31994 - add attributes, teams, owners
  };

  const { createProcessingPurposeSubCategory } = await makeGraphQLRequest<{
    /** Create processing purpose mutation */
    createProcessingPurposeSubCategory: {
      /** Created processing purpose */
      processingPurposeSubCategory: ProcessingPurposeSubCategory;
    };
  }>(client, CREATE_PROCESSING_PURPOSE_SUB_CATEGORY, {
    variables: { input },
    logger: options.logger,
  });
  return createProcessingPurposeSubCategory.processingPurposeSubCategory;
}

/**
 * Input to update processing purposes
 *
 * @param client - GraphQL client
 * @param processingPurposeIdPairs - [ProcessingPurposeInput, processingPurposeId] list
 * @param options - Options
 */
export async function updateProcessingPurposes(
  client: GraphQLClient,
  processingPurposeIdPairs: [ProcessingPurposeInput, string][],
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_PROCESSING_PURPOSE_SUB_CATEGORIES, {
    variables: {
      input: {
        processingPurposeSubCategories: processingPurposeIdPairs.map(([processingPurpose, id]) => ({
          id,
          description: processingPurpose.description,
          // TODO: https://transcend.height.app/T-31994 - add  teams, owners
          attributes: processingPurpose.attributes,
        })),
      },
    },
    logger: options.logger,
  });
}

/**
 * Sync the data inventory processing purposes
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncProcessingPurposes(
  client: GraphQLClient,
  inputs: ProcessingPurposeInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;

  logger.info(`Syncing "${inputs.length}" processing purposes...`);

  let encounteredError = false;

  const existingProcessingPurposes = await fetchAllProcessingPurposes(client, { logger });

  const processingPurposeByName: {
    [k in string]: Pick<ProcessingPurposeSubCategory, 'id' | 'name'>;
  } = keyBy(existingProcessingPurposes, ({ name, purpose }) => `${name}:${purpose}`);

  const newProcessingPurposes = inputs.filter(
    (input) => !processingPurposeByName[`${input.name}:${input.purpose}`],
  );

  await mapSeries(newProcessingPurposes, async (processingPurpose) => {
    try {
      const newProcessingPurpose = await createProcessingPurpose(client, processingPurpose, {
        logger,
      });
      processingPurposeByName[`${newProcessingPurpose.name}:${newProcessingPurpose.purpose}`] =
        newProcessingPurpose;
      logger.info(`Successfully synced processing purpose "${processingPurpose.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to sync processing purpose "${processingPurpose.name}"! - ${(err as Error).message}`,
      );
    }
  });

  try {
    logger.info(`Updating "${inputs.length}" processing purposes!`);
    await updateProcessingPurposes(
      client,
      inputs.map((input) => [input, processingPurposeByName[`${input.name}:${input.purpose}`]!.id]),
      { logger },
    );
    logger.info(`Successfully synced "${inputs.length}" processing purposes!`);
  } catch (err) {
    encounteredError = true;
    logger.error(
      `Failed to sync "${inputs.length}" processing purposes ! - ${(err as Error).message}`,
    );
  }

  return !encounteredError;
}

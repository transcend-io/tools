import { DataCategoryType } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllDataCategories, DataSubCategory } from './fetchAllDataCategories.js';
import { UPDATE_DATA_SUB_CATEGORIES, CREATE_DATA_SUB_CATEGORY } from './gqls/dataCategory.js';

export interface DataCategoryInput {
  /** Name of data category */
  name: string;
  /** Type of data category */
  category: DataCategoryType;
  /** Description of data category */
  description?: string;
  /** Regex for data category */
  regex?: string;
  /** Owner email addresses to assign */
  owners?: string[];
  /** Team names to assign */
  teams?: string[];
  /** Attribute value and its corresponding attribute key */
  attributes?: {
    /** Attribute key */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
}

/**
 * Create a new data category
 *
 * @param client - GraphQL client
 * @param dataCategory - Input
 * @param options - Options
 * @returns Created data category
 */
export async function createDataCategory(
  client: GraphQLClient,
  dataCategory: DataCategoryInput,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Pick<DataSubCategory, 'id' | 'name' | 'category'>> {
  const { logger } = options;
  const input = {
    name: dataCategory.name,
    category: dataCategory.category,
    description: dataCategory.description,
    // TODO: https://transcend.height.app/T-31994 - add attributes, teams, owners
  };

  const { createDataCategory } = await makeGraphQLRequest<{
    /** Create data category mutation */
    createDataCategory: {
      /** Created data category */
      dataCategory: DataSubCategory;
    };
  }>(client, CREATE_DATA_SUB_CATEGORY, {
    variables: { input },
    logger,
  });
  return createDataCategory.dataCategory;
}

/**
 * Update data categories
 *
 * @param client - GraphQL client
 * @param dataCategoryIdPairs - [DataCategoryInput, dataCategoryId] list
 * @param options - Options
 */
export async function updateDataCategories(
  client: GraphQLClient,
  dataCategoryIdPairs: [DataCategoryInput, string][],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  await makeGraphQLRequest(client, UPDATE_DATA_SUB_CATEGORIES, {
    variables: {
      input: {
        dataSubCategories: dataCategoryIdPairs.map(([dataCategory, id]) => ({
          id,
          description: dataCategory.description,
          // TODO: https://transcend.height.app/T-31994 - add  teams, owners
          attributes: dataCategory.attributes,
        })),
      },
    },
    logger,
  });
}

/**
 * Sync the data inventory data categories
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncDataCategories(
  client: GraphQLClient,
  inputs: DataCategoryInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  logger.info(`Syncing "${inputs.length}" data categories...`);

  let encounteredError = false;

  // Fetch existing
  const existingDataCategories = await fetchAllDataCategories(client, {
    logger,
  });

  // Look up by name
  const dataCategoryByName: {
    [k in string]: Pick<DataSubCategory, 'id' | 'name' | 'category'>;
  } = keyBy(existingDataCategories, ({ name, category }) => `${name}:${category}`);

  // Create new data categories
  const newDataCategories = inputs.filter(
    (input) => !dataCategoryByName[`${input.name}:${input.category}`],
  );

  await mapSeries(newDataCategories, async (dataCategory) => {
    try {
      const newDataCategory = await createDataCategory(client, dataCategory, { logger });
      dataCategoryByName[`${newDataCategory.name}:${newDataCategory.category}`] = newDataCategory;
      logger.info(`Successfully synced data category "${dataCategory.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to sync data category "${dataCategory.name}"! - ${(err as Error).message}`,
      );
    }
  });

  // Update all data categories
  try {
    logger.info(`Updating "${inputs.length}" data categories!`);
    await updateDataCategories(
      client,
      inputs.map((input) => [input, dataCategoryByName[`${input.name}:${input.category}`]!.id]),
      { logger },
    );
    logger.info(`Successfully synced "${inputs.length}" data categories!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to sync "${inputs.length}" data categories ! - ${(err as Error).message}`);
  }

  return !encounteredError;
}

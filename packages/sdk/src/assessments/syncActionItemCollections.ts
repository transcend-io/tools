import { TranscendProduct } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import {
  ActionItemCollection,
  fetchAllActionItemCollections,
} from './fetchAllActionItemCollections.js';
import {
  CREATE_ACTION_ITEM_COLLECTION,
  UPDATE_ACTION_ITEM_COLLECTION,
} from './gqls/actionItemCollection.js';

export interface ActionItemCollectionInput {
  /** The display title of the collection */
  title: string;
  /** Locations where collection is shown */
  productLine: TranscendProduct;
  /** Description of collection */
  description?: string;
  /** Whether hidden */
  hidden?: boolean;
}

/**
 * Create a new action item collection
 *
 * @param client - GraphQL client
 * @param actionItemCollection - Input
 * @param options - Options
 * @returns Created action item collection
 */
export async function createActionItemCollection(
  client: GraphQLClient,
  options: {
    /** Action item collection to create */
    input: ActionItemCollectionInput;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<Pick<ActionItemCollection, 'id' | 'title'>> {
  const { input: actionItemCollection, logger = NOOP_LOGGER } = options;
  const input = {
    title: actionItemCollection.title,
    description: actionItemCollection.description || '',
    hidden: actionItemCollection.hidden || false,
    productLine: actionItemCollection.productLine,
  };

  const { createActionItemCollection } = await makeGraphQLRequest<{
    /** Create actionItemCollection mutation */
    createActionItemCollection: {
      /** Created actionItemCollection */
      created: ActionItemCollection;
    };
  }>(client, CREATE_ACTION_ITEM_COLLECTION, {
    variables: { input },
    logger,
  });
  return createActionItemCollection.created;
}

/**
 * Update an action item collection
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateActionItemCollection(
  client: GraphQLClient,
  options: {
    /** Action item collection input to update */
    input: ActionItemCollectionInput & {
      /** ID of action item collection to update */
      id: string;
    };
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { input: actionItemCollection, logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_ACTION_ITEM_COLLECTION, {
    variables: {
      input: {
        id: actionItemCollection.id,
        title: actionItemCollection.title,
        description: actionItemCollection.description,
        hidden: actionItemCollection.hidden,
        productLine: actionItemCollection.productLine,
      },
    },
    logger,
  });
}

/**
 * Sync the action item collections
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncActionItemCollections(
  client: GraphQLClient,
  inputs: ActionItemCollectionInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  let encounteredError = false;
  logger.info(`Syncing "${inputs.length}" action item collections...`);

  const existingActionItemCollections = await fetchAllActionItemCollections(client, { logger });

  const collectionByTitle: { [k in string]: ActionItemCollection } = keyBy(
    existingActionItemCollections,
    'title',
  );

  const newCollections = inputs.filter((input) => !collectionByTitle[input.title]);

  await mapSeries(newCollections, async (input) => {
    try {
      await createActionItemCollection(client, { input, logger });
      logger.info(`Successfully created action item collection "${input.title}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to create action item collection "${input.title}"! - ${(err as Error).message}`,
      );
    }
  });

  const actionItemsToUpdate = inputs
    .map((input) => [input, collectionByTitle[input.title]?.id])
    .filter((x): x is [ActionItemCollectionInput, string] => !!x[1]);
  await mapSeries(actionItemsToUpdate, async ([input, actionItemId]) => {
    try {
      await updateActionItemCollection(client, {
        input: { ...input, id: actionItemId },
        logger,
      });
      logger.info(`Successfully synced action item collection "${input.title}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to sync action item collection "${input.title}"! - ${(err as Error).message}`,
      );
    }
  });

  return !encounteredError;
}

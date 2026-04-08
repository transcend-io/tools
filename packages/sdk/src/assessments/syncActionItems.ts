import { ActionItemCode, ActionItemPriorityOverride } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { uniq, keyBy, chunk } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import {
  ActionItemCollection,
  fetchAllActionItemCollections,
} from './fetchAllActionItemCollections.js';
import { fetchAllActionItems, ActionItem } from './fetchAllActionItems.js';
import { UPDATE_ACTION_ITEMS, CREATE_ACTION_ITEMS } from './gqls/actionItem.js';

/** Minimal attribute key shape needed for action item sync */
export interface ActionItemAttributeKey {
  /** ID of attribute */
  id: string;
  /** Name of attribute */
  name: string;
}

export interface ActionItemInput {
  /** The display title of the action item */
  title: string;
  /** Action item type */
  type: ActionItemCode;
  /** The titles of the collections that the action item is grouped within */
  collections: string[];
  /** Priority of the action item */
  priority?: ActionItemPriorityOverride;
  /** Customer experience action item key */
  customerExperienceActionItemId?: string;
  /** Due date of the action item */
  dueDate?: string;
  /** Whether action item has been resolved */
  resolved?: boolean;
  /** Notes */
  notes?: string;
  /** Links to action items */
  link?: string;
  /** The email addresses of the employees assigned to the action item */
  users?: string[];
  /** The names of teams assigned to the action item */
  teams?: string[];
  /** Attribute value and its corresponding attribute key */
  attributes?: {
    /** Attribute key name */
    key: string;
    /** Attribute value names */
    values: string[];
  }[];
}

/**
 * Create new action items
 *
 * @param client - GraphQL client
 * @param actionItems - Action item inputs
 * @param actionItemCollectionByTitle - Action item collections indexed by title
 * @param options - Options
 */
export async function createActionItems(
  client: GraphQLClient,
  options: {
    /** Action items to create */
    input: ActionItemInput[];
    /** Logger instance */
    logger?: Logger;
    /** Action item collections indexed by title */
    actionItemCollectionByTitle: {
      [k in string]: ActionItemCollection;
    };
    // TODO: https://transcend.height.app/T-38961 - insert attributes
    /** Attribute keys indexed by name */
    attributeKeysByName?: {
      [k in string]: ActionItemAttributeKey;
    };
  },
): Promise<void> {
  const { input: actionItems, logger = NOOP_LOGGER, actionItemCollectionByTitle } = options;
  // TODO: https://transcend.height.app/T-38961 - insert attributes
  // const getAttribute = (key: string): string => {
  //   const existing = attributeKeysByName[key];
  //   if (!existing) {
  //     throw new Error(`Attribute key "${key}" does not exist!`);
  //   }
  //   return existing.id;
  // };
  const chunked = chunk(actionItems, 100);
  await mapSeries(chunked, async (chunkToUpload) => {
    await makeGraphQLRequest(client, CREATE_ACTION_ITEMS, {
      variables: {
        input: chunkToUpload.map((actionItem) => ({
          title: actionItem.title,
          type: actionItem.type,
          priorityOverride: actionItem.priority,
          dueDate: actionItem.dueDate,
          customerExperienceActionItemId: actionItem.customerExperienceActionItemId,
          resolved: actionItem.resolved,
          notes: actionItem.notes,
          link: actionItem.link,
          assigneesUserEmails: actionItem.users,
          assigneesTeamNames: actionItem.teams,
          ...(actionItem.attributes
            ? {
                // TODO: https://transcend.height.app/T-38961 - insert attributes
                // attributes: actionItem.attributes.map(({ key, values }) => ({
                //   attributeKeyId: getAttribute(key),
                //   attributeValueNames: values,
                // })),
              }
            : {}),
          collectionIds: actionItem.collections.map(
            (collectionTitle) => actionItemCollectionByTitle[collectionTitle]!.id,
          ),
        })),
      },
      logger,
    });
  });
}

/**
 * Update an action item
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateActionItem(
  client: GraphQLClient,
  options: {
    /** Action item input to update */
    input: ActionItemInput & {
      /** ID of action item to update */
      id: string;
    };
    /** Logger instance */
    logger?: Logger;
    /** Attribute keys indexed by name */
    attributeKeysByName?: {
      [k in string]: ActionItemAttributeKey;
    };
  },
): Promise<void> {
  const { input: actionItem, logger = NOOP_LOGGER, attributeKeysByName = {} } = options;
  const getAttribute = (key: string): string => {
    const existing = attributeKeysByName[key];
    if (!existing) {
      throw new Error(`Attribute key "${key}" does not exist!`);
    }
    return existing.id;
  };
  await makeGraphQLRequest(client, UPDATE_ACTION_ITEMS, {
    variables: {
      input: {
        ids: [actionItem.id],
        title: actionItem.title,
        priorityOverride: actionItem.priority,
        dueDate: actionItem.dueDate,
        resolved: actionItem.resolved,
        customerExperienceActionItemId: actionItem.customerExperienceActionItemId,
        notes: actionItem.notes,
        link: actionItem.link,
        assigneesUserEmails: actionItem.users,
        assigneesTeamNames: actionItem.teams,
        ...(actionItem.attributes
          ? {
              attributes: actionItem.attributes.map(({ key, values }) => ({
                attributeKeyId: getAttribute(key),
                attributeValueNames: values,
              })),
            }
          : {}),
      },
    },
    logger,
  });
}

/**
 * Convert action item to a unique key
 *
 * @param actionItem - action item
 * @returns Unique key
 */
function actionItemToUniqueCode({
  title,
  collections,
}: Pick<ActionItem, 'title' | 'collections'>): string {
  return `${title}-${collections
    .map((c) => c.title)
    .sort()
    .join('-')}`;
}

/**
 * Convert action item input to a unique key
 *
 * @param actionItem - action item
 * @returns Unique key
 */
function actionItemInputToUniqueCode({
  title,
  collections,
}: Pick<ActionItemInput, 'title' | 'collections'>): string {
  return `${title}-${collections.sort().join('-')}`;
}

/**
 * Sync the action items
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncActionItems(
  client: GraphQLClient,
  inputs: ActionItemInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Pre-fetched attribute keys (pass result of fetchAllAttributes) */
    attributeKeys?: ActionItemAttributeKey[];
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER, attributeKeys = [] } = options;
  let encounteredError = false;
  logger.info(`Syncing "${inputs.length}" actionItems...`);

  const [existingActionItems, existingActionItemCollections] = await Promise.all([
    fetchAllActionItems(client, { logger }),
    fetchAllActionItemCollections(client, { logger }),
  ]);

  const actionItemCollectionByTitle: { [k in string]: ActionItemCollection } = keyBy(
    existingActionItemCollections,
    'title',
  );
  const actionItemByTitle = keyBy(existingActionItems, actionItemToUniqueCode) as {
    [k in string]: ActionItem;
  };
  const attributeKeysByName = keyBy(attributeKeys, 'name');
  const actionItemByCxId = keyBy(
    existingActionItems.filter((x) => !!x.customerExperienceActionItemIds),
    ({ customerExperienceActionItemIds }) => customerExperienceActionItemIds[0],
  ) as { [k in string]: ActionItem };

  const missingCollections = uniq(inputs.map((input) => input.collections).flat()).filter(
    (collectionTitle) => !actionItemCollectionByTitle[collectionTitle],
  );
  if (missingCollections.length > 0) {
    logger.error(
      `Missing action item collections: "${missingCollections.join(
        '", "',
      )}" - please create them first!`,
    );
    return false;
  }

  const newActionItems = inputs.filter(
    (input) =>
      !actionItemByTitle[actionItemInputToUniqueCode(input)] &&
      !actionItemByCxId[input.customerExperienceActionItemId!],
  );

  if (newActionItems.length > 0) {
    try {
      logger.info(`Creating "${newActionItems.length}" actionItems...`);
      await createActionItems(client, {
        input: newActionItems,
        logger,
        actionItemCollectionByTitle,
        attributeKeysByName,
      });
      logger.info(`Successfully created "${newActionItems.length}" actionItems!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to create action items! - ${(err as Error).message}`);
    }
  }

  const actionItemsToUpdate = inputs
    .map((input) => [
      input,
      actionItemByTitle[actionItemInputToUniqueCode(input)]?.id ||
        actionItemByCxId[input.customerExperienceActionItemId!]?.id,
    ])
    .filter((x): x is [ActionItemInput, string] => !!x[1]);
  await mapSeries(actionItemsToUpdate, async ([input, actionItemId]) => {
    try {
      await updateActionItem(client, {
        input: { ...input, id: actionItemId },
        logger,
        attributeKeysByName,
      });
      logger.info(`Successfully synced action item "${input.title}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(`Failed to sync action item "${input.title}"! - ${(err as Error).message}`);
    }
  });

  return !encounteredError;
}

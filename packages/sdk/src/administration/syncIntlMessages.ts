import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { UPDATE_INTL_MESSAGES } from './gqls/message.js';

export interface IntlMessageInput {
  id: string;
  targetReactIntlId?: string;
  description?: string;
  defaultMessage?: string;
  translations?: Record<string, string>;
}

const MAX_PAGE_SIZE = 100;

/**
 * Update or create intl messages
 *
 * @param client - GraphQL client
 * @param messageInputs - List of message inputs
 */
export async function updateIntlMessages(
  client: GraphQLClient,
  messageInputs: IntlMessageInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  // Batch update messages
  await mapSeries(chunk(messageInputs, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_INTL_MESSAGES, {
      variables: {
        messages: page.map((message) => ({
          ...(message.id.includes('.') ? {} : { id: message.id }),
          defaultMessage: message.defaultMessage,
          targetReactIntlId: message.targetReactIntlId,
          translations: !message.translations
            ? undefined
            : Object.entries(message.translations).map(([locale, value]) => ({
                locale,
                value,
              })),
        })),
      },
      logger,
    });
  });
}

/**
 * Sync the set of messages from the YML interface into the product
 *
 * @param client - GraphQL client
 * @param messages - messages to sync
 * @returns True upon success, false upon failure
 */
export async function syncIntlMessages(
  client: GraphQLClient,
  messages: IntlMessageInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<boolean> {
  const { logger } = options;
  let encounteredError = false;
  logger.info(`Syncing "${messages.length}" messages...`);

  // Ensure no duplicates are being uploaded
  const notUnique = messages.filter(
    (message) => messages.filter((pol) => message.id === pol.id).length > 1,
  );
  if (notUnique.length > 0) {
    throw new Error(
      `Failed to upload messages as there were non-unique entries found: ${notUnique
        .map(({ id }) => id)
        .join(',')}`,
    );
  }

  try {
    logger.info(`Upserting "${messages.length}" new messages...`);
    await updateIntlMessages(client, messages, { logger });
    logger.info(`Successfully synced ${messages.length} messages!`);
  } catch (err) {
    encounteredError = true;
    logger.info(`Failed to create messages! - ${(err as Error).message}`);
  }

  return !encounteredError;
}

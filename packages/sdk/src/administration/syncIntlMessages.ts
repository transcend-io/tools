import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { chunk } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllMessages } from './fetchAllMessages.js';
import { UPDATE_INTL_MESSAGES } from './gqls/message.js';
import { intlMessageStableKey, resolveIntlMessageMatch } from './resolveIntlMessageMatch.js';

export interface IntlMessageInput {
  /** React Intl message ID */
  id: string;
  /** Target React Intl ID to map this message to */
  targetReactIntlId?: string;
  /** Description of the message for translators */
  description?: string;
  /** Default English message content */
  defaultMessage?: string;
  /** Map from locale code to translated string */
  translations?: Record<string, string>;
}

const MAX_PAGE_SIZE = 100;

function toGraphQlMessageInput(
  message: IntlMessageInput,
  resolvedId?: string,
): {
  id?: string;
  defaultMessage: string;
  targetReactIntlId?: string;
  translations?: { locale: string; value: string }[];
} {
  const defaultMessage = message.defaultMessage ?? '';
  const useResolvedId = resolvedId ?? (message.id.includes('.') ? undefined : message.id);

  return {
    ...(useResolvedId ? { id: useResolvedId } : {}),
    defaultMessage,
    ...(message.targetReactIntlId !== undefined
      ? { targetReactIntlId: message.targetReactIntlId }
      : {}),
    translations: !message.translations
      ? []
      : Object.entries(message.translations).map(([locale, value]) => ({
          locale,
          value,
        })),
  };
}

/**
 * Update or create intl messages
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function updateIntlMessages(
  client: GraphQLClient,
  options: {
    /** List of message inputs */
    input: IntlMessageInput[];
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { input: messages, logger = NOOP_LOGGER } = options;
  // Batch update messages
  const existing = await fetchAllMessages(client, { logger });

  await mapSeries(chunk(messages, MAX_PAGE_SIZE), async (page) => {
    await makeGraphQLRequest(client, UPDATE_INTL_MESSAGES, {
      variables: {
        messages: page.map((message) => {
          const match = resolveIntlMessageMatch(message, existing);
          return toGraphQlMessageInput(message, match?.id);
        }),
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
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  let encounteredError = false;
  logger.info(`Syncing "${messages.length}" messages...`);

  // Ensure no duplicates are being uploaded
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const message of messages) {
    const key = intlMessageStableKey(message);
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.add(key);
    }
  }
  if (duplicates.length > 0) {
    throw new Error(
      `Failed to upload messages as there were non-unique entries found: ${duplicates.join(',')}`,
    );
  }

  try {
    logger.info(`Upserting "${messages.length}" new messages...`);
    await updateIntlMessages(client, { input: messages, logger });
    logger.info(`Successfully synced ${messages.length} messages!`);
  } catch (err) {
    encounteredError = true;
    logger.error(`Failed to create messages! - ${(err as Error).message}`);
  }

  return !encounteredError;
}

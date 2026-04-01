import type { LocaleValue } from '@transcend-io/internationalization';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { MESSAGES } from './gqls/message.js';

export interface Message {
  /** ID of message */
  id: string;
  /** Default message */
  defaultMessage: string;
  /** Description */
  description: string;
  /** React Intl ID */
  targetReactIntlId: string | null;
  /** Disabled locales */
  translations: {
    /** Locale */
    locale: LocaleValue;
    /** Value */
    value: string;
  }[];
}

/**
 * Fetch all messages in the organization
 *
 * @param client - GraphQL client
 * @returns All messages in the organization
 */
export async function fetchAllMessages(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<Message[]> {
  const { logger } = options;
  const { translatedMessages } = await makeGraphQLRequest<{
    /** Messages */
    translatedMessages: Message[];
  }>(client, MESSAGES, { logger });
  return translatedMessages;
}

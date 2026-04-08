import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { TEMPLATES, CREATE_TEMPLATE } from './gqls/template.js';

export interface Template {
  /** ID of Template */
  id: string;
  /** Title of Template */
  title: string;
  /** Template subject (e.g. email subject) */
  subject: {
    /** Default message for template subject */
    defaultMessage: string;
  };
  /** Template body - rich text HTML */
  template: {
    /** Default message for template body */
    defaultMessage: string;
  };
}

export interface SyncTemplateInput {
  /** The title of the template */
  title: string;
}

const PAGE_SIZE = 20;

/**
 * Fetch all Templates in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All Templates in the organization
 */
export async function fetchAllTemplates(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter options */
    filterBy?: {
      /** Filter by title */
      title?: string;
    };
  },
): Promise<Template[]> {
  const { logger, filterBy: { title } = {} } = options;
  const templates: Template[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      templates: { nodes },
    } = await makeGraphQLRequest<{
      /** Query response */
      templates: {
        /** List of matches */
        nodes: Template[];
      };
    }>(client, TEMPLATES, {
      variables: { first: PAGE_SIZE, offset, title },
      logger,
    });
    templates.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return templates.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Sync an email template configuration
 *
 * @param client - GraphQL client
 * @param template - The email template input
 * @param options - Options
 */
export async function syncTemplate(
  client: GraphQLClient,
  template: SyncTemplateInput,
  options: {
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { logger } = options;
  const matches = await fetchAllTemplates(client, {
    logger,
    filterBy: { title: template.title },
  });
  const existingTemplate = matches.find(({ title }) => title === template.title);

  if (!existingTemplate) {
    await makeGraphQLRequest(client, CREATE_TEMPLATE, {
      variables: { title: template.title },
      logger,
    });
  }
}

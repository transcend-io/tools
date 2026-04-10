import { RequestAction } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { TOGGLE_DATA_SUBJECT, UPDATE_DATA_SUBJECT } from './gqls/dataSubject.js';

export interface DataSubjectInput {
  /** The type of the data subject */
  type: string;
  /** Whether the data subject is active on the Privacy Center & DSR API */
  active?: boolean;
  /** The title of the data subject */
  title?: string;
  /** Whether or not to default new requests made in the admin dashboard to silent mode */
  adminDashboardDefaultSilentMode?: boolean;
  /** Enabled request actions for the data subject */
  actions?: RequestAction[];
}

/**
 * Sync the data subjects
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncDataSubject(
  client: GraphQLClient,
  options: {
    /** DataSubject update input */
    input: DataSubjectInput;
    /** Existing data subject Id */
    dataSubjectId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
    /** Logger instance */
    logger?: Logger;
  },
): Promise<void> {
  const { input: dataSubject, dataSubjectId, skipPublish = false, logger = NOOP_LOGGER } = options;
  await makeGraphQLRequest(client, UPDATE_DATA_SUBJECT, {
    variables: {
      input: {
        id: dataSubjectId,
        title: dataSubject.title,
        adminDashboardDefaultSilentMode: dataSubject.adminDashboardDefaultSilentMode,
        actions: dataSubject.actions,
        skipPublish: skipPublish && typeof dataSubject.active === 'undefined',
      },
    },
    logger,
  });

  if (typeof dataSubject.active === 'boolean') {
    await makeGraphQLRequest(client, TOGGLE_DATA_SUBJECT, {
      variables: {
        input: {
          id: dataSubjectId,
          active: dataSubject.active,
          skipPublish,
        },
      },
      logger,
    });
  }
}

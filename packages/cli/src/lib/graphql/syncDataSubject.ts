import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';

import { DataSubjectInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { UPDATE_DATA_SUBJECT, TOGGLE_DATA_SUBJECT } from './gqls/index.js';

/**
 * Sync the data subjects
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncDataSubject(
  client: GraphQLClient,
  {
    dataSubject,
    dataSubjectId,
    skipPublish = false,
  }: {
    /** DataSubject update input */
    dataSubject: DataSubjectInput;
    /** Existing data subject Id */
    dataSubjectId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
  },
): Promise<void> {
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

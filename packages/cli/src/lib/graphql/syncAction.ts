import { IsoCountryCode, IsoCountrySubdivisionCode } from '@transcend-io/privacy-types';
import { makeGraphQLRequest } from '@transcend-io/sdk';
import { GraphQLClient } from 'graphql-request';
import { difference } from 'lodash-es';

import { ActionInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { UPDATE_ACTION } from './gqls/index.js';

const ALL_COUNTRIES_AND_SUBDIVISIONS = [
  ...Object.values(IsoCountryCode),
  ...Object.values(IsoCountrySubdivisionCode),
];

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param options - Options
 */
export async function syncAction(
  client: GraphQLClient,
  {
    action,
    actionId,
    skipPublish = false,
  }: {
    /** Action update input */
    action: ActionInput;
    /** Existing action Id */
    actionId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
  },
): Promise<void> {
  await makeGraphQLRequest(client, UPDATE_ACTION, {
    variables: {
      input: {
        id: actionId,
        skipSecondaryIfNoFiles: action.skipSecondaryIfNoFiles,
        skipDownloadableStep: action.skipDownloadableStep,
        requiresReview: action.requiresReview,
        waitingPeriod: action.waitingPeriod,
        skipPublish,
        regionList: action.regionBlockList
          ? difference(ALL_COUNTRIES_AND_SUBDIVISIONS, action.regionBlockList)
          : action.regionList,
        regionDetectionMethod: action.regionDetectionMethod,
      },
    },
    logger,
  });
}

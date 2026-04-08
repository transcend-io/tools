import { IsoCountryCode, IsoCountrySubdivisionCode } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { difference } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { UPDATE_ACTION } from './gqls/action.js';

const ALL_COUNTRIES_AND_SUBDIVISIONS = [
  ...Object.values(IsoCountryCode),
  ...Object.values(IsoCountrySubdivisionCode),
];

export interface SyncActionInput {
  /** Whether to skip secondary when no files exist */
  skipSecondaryIfNoFiles?: boolean;
  /** Whether to skip downloadable step */
  skipDownloadableStep?: boolean;
  /** Whether the request action requires review */
  requiresReview?: boolean;
  /** The wait period for the action */
  waitingPeriod?: number;
  /** The method in which the data subject's region is detected */
  regionDetectionMethod?: string;
  /** The list of regions to show in the form */
  regionList?: (IsoCountryCode | IsoCountrySubdivisionCode)[];
  /** The list of regions NOT to show in the form */
  regionBlockList?: (IsoCountryCode | IsoCountrySubdivisionCode)[];
}

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param actionInput - Action update details
 * @param options - Options
 */
export async function syncAction(
  client: GraphQLClient,
  actionInput: {
    /** Action update input */
    action: SyncActionInput;
    /** Existing action Id */
    actionId: string;
    /** When true, skip publishing to privacy center */
    skipPublish?: boolean;
  },
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger } = options;
  const { action, actionId, skipPublish = false } = actionInput;
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

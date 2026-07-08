import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { PREFERENCE_OPTION_VALUES } from './gqls/preferenceTopicMutations.js';

export interface PreferenceOptionValue {
  /** ID of preference option value */
  id: string;
  /** Slug of preference option value */
  slug: string;
  /** Title of preference option value */
  title: {
    /** ID */
    id: string;
    /** Default message */
    defaultMessage: string;
  };
}

const PAGE_SIZE = 50;

/**
 * Fetch all preference option values in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All preference option values in the organization
 */
export async function fetchAllPreferenceOptionValues(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<PreferenceOptionValue[]> {
  const { logger } = options;
  const preferenceOptionValues: PreferenceOptionValue[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      preferenceOptionValues: { nodes },
    } = await makeGraphQLRequest<{
      /** Preference option values */
      preferenceOptionValues: {
        /** List */
        nodes: PreferenceOptionValue[];
      };
    }>(client, PREFERENCE_OPTION_VALUES, {
      variables: { first: PAGE_SIZE, offset },
      logger,
    });
    preferenceOptionValues.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return preferenceOptionValues.sort((a, b) => a.slug.localeCompare(b.slug));
}

import { type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  fetchAllPreferenceOptionValues,
  type PreferenceOptionValue,
} from './fetchAllPreferenceOptionValues.js';
import { CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES } from './gqls/preferenceOptionValues.js';

export interface PreferenceOptionValueInput {
  /** Title of option value */
  title: string;
  /** API slug */
  slug: string;
}

/**
 * Create or update preference option values
 *
 * @param client - GraphQL client
 * @param optionValues - Preference option values paired with existing IDs
 * @param options - Options
 * @returns Created/updated preference option values
 */
export async function createOrUpdatePreferenceOptionValues(
  client: GraphQLClient,
  optionValues: [PreferenceOptionValueInput, string | undefined][],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<PreferenceOptionValue[]> {
  const { logger } = options;
  const result = await makeGraphQLRequest<{
    /** createOrUpdatePreferenceOptionValues mutation */
    createOrUpdatePreferenceOptionValues: {
      /** Preference option values */
      preferenceOptionValues: PreferenceOptionValue[];
    };
  }>(client, CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES, {
    variables: {
      input: {
        preferenceOptionValues: optionValues.map(([optionValue, id]) => ({
          ...optionValue,
          id,
        })),
      },
    },
    logger,
  });
  return result.createOrUpdatePreferenceOptionValues.preferenceOptionValues;
}

/**
 * Sync the preference option values
 *
 * @param client - GraphQL client
 * @param optionValues - Preference option values
 * @param options - Options
 * @returns True if run without error
 */
export async function syncPreferenceOptionValues(
  client: GraphQLClient,
  optionValues: PreferenceOptionValueInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger } = options;
  logger?.info(`Syncing "${optionValues.length}" preference option values...`);

  const existing = await fetchAllPreferenceOptionValues(client, { logger });
  const optionValueBySlug = keyBy(existing, 'slug');

  try {
    await createOrUpdatePreferenceOptionValues(
      client,
      optionValues.map((optionValueInput) => [
        optionValueInput,
        optionValueBySlug[optionValueInput.slug]?.id,
      ]),
      { logger },
    );
    logger?.info(`Successfully synced "${optionValues.length}" preference option values!`);
    return true;
  } catch (err) {
    logger?.error(`Failed to sync preference option values! - ${(err as Error).message}`);
    return false;
  }
}

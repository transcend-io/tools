import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { chunk, keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  fetchAllPreferenceOptionValues,
  type PreferenceOptionValue,
} from './fetchAllPreferenceOptionValues.js';
import { CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES } from './gqls/preferenceOptionValues.js';
import type { ConsentPreferenceTopicOptionValue } from './transcendYmlCodecs.js';

const MAX_BATCH_SIZE = 50;

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
  optionValues: [ConsentPreferenceTopicOptionValue, string | undefined][],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<PreferenceOptionValue[]> {
  const { logger } = options;
  const results: PreferenceOptionValue[] = [];

  await mapSeries(chunk(optionValues, MAX_BATCH_SIZE), async (batch) => {
    const result = await makeGraphQLRequest<{
      /** createOrUpdatePreferenceOptionValues mutation */
      createOrUpdatePreferenceOptionValues: {
        /** Preference option values */
        preferenceOptionValues: PreferenceOptionValue[];
      };
    }>(client, CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES, {
      variables: {
        input: {
          preferenceOptionValues: batch.map(([optionValue, id]) => ({
            ...optionValue,
            id,
          })),
        },
      },
      logger,
    });
    results.push(...result.createOrUpdatePreferenceOptionValues.preferenceOptionValues);
  });

  return results;
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
  optionValues: ConsentPreferenceTopicOptionValue[],
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

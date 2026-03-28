import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { ConsentPreferenceTopicOptionValue } from '../../codecs.js';
import { logger } from '../../logger.js';
import {
  fetchAllPreferenceOptionValues,
  type PreferenceOptionValue,
} from './fetchAllPreferenceOptionValues.js';
import { CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES } from './gqls/index.js';
import { makeGraphQLRequest } from './makeGraphQLRequest.js';

/**
 * Create or update preference option values
 *
 * @param client - GraphQL client
 * @param optionValues - Preference option values paired with existing IDs
 * @returns Created/updated preference option values
 */
export async function createOrUpdatePreferenceOptionValues(
  client: GraphQLClient,
  optionValues: [ConsentPreferenceTopicOptionValue, string | undefined][],
): Promise<PreferenceOptionValue[]> {
  const result = await makeGraphQLRequest<{
    /** createOrUpdatePreferenceOptionValues mutation */
    createOrUpdatePreferenceOptionValues: {
      /** Preference option values */
      preferenceOptionValues: PreferenceOptionValue[];
    };
  }>(client, CREATE_OR_UPDATE_PREFERENCE_OPTION_VALUES, {
    input: {
      input: {
        preferenceOptionValues: optionValues.map(([optionValue, id]) => ({
          ...optionValue,
          id,
        })),
      },
    },
  });
  return result.createOrUpdatePreferenceOptionValues.preferenceOptionValues;
}

/**
 * Sync the preference option values
 *
 * @param client - GraphQL client
 * @param optionValues - Preference option values
 * @returns True if synced successfully
 */
export async function syncPreferenceOptionValues(
  client: GraphQLClient,
  optionValues: ConsentPreferenceTopicOptionValue[],
): Promise<boolean> {
  let encounteredError = false;
  logger.info(colors.magenta(`Syncing "${optionValues.length}" preference option values...`));

  const existing = await fetchAllPreferenceOptionValues(client);
  const optionValueBySlug = keyBy(existing, 'slug');

  try {
    logger.info(
      colors.magenta(
        `Performing bulk create or update for "${optionValues.length}" preference option values...`,
      ),
    );

    await createOrUpdatePreferenceOptionValues(
      client,
      optionValues.map((optionValueInput) => [
        optionValueInput,
        optionValueBySlug[optionValueInput.slug]?.id,
      ]),
    );

    logger.info(
      colors.green(`Successfully synced "${optionValues.length}" preference option values!`),
    );
  } catch (err) {
    encounteredError = true;
    logger.info(colors.red(`Failed to sync preference option values! - ${err.message}`));
  }

  return !encounteredError;
}

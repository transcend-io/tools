import { type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy, uniqBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllPreferenceOptionValues } from './fetchAllPreferenceOptionValues.js';
import { fetchAllPreferenceTopics } from './fetchAllPreferenceTopics.js';
import { fetchAllPurposes } from './fetchAllPurposes.js';
import { CREATE_OR_UPDATE_PREFERENCE_TOPIC } from './gqls/preferenceTopic.js';
import { createOrUpdatePreferenceOptionValues } from './syncPreferenceOptionValues.js';
import type { PreferenceTopicWithPurpose } from './transcendYmlCodecs.js';

/**
 * Sync preference topics to Transcend, matching existing topics by (trackingType, slug).
 * Inline option values are upserted (by slug) so their IDs can be linked to the topic.
 *
 * @param client - GraphQL client
 * @param topics - Preference topic inputs, each tagged with its purpose trackingType
 * @param options - Options
 * @returns True if every topic synced without error
 */
export async function syncPreferenceTopics(
  client: GraphQLClient,
  topics: PreferenceTopicWithPurpose[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Pre-resolved trackingType -> purpose ID map (avoids re-fetching purposes) */
    purposeIdByTrackingType?: Record<string, string>;
  } = {},
): Promise<boolean> {
  const { logger } = options;
  logger?.info(`Syncing "${topics.length}" preference topics...`);

  // Resolve purpose IDs (reuse the map from syncPurposes when provided)
  let { purposeIdByTrackingType } = options;
  if (!purposeIdByTrackingType) {
    const purposes = await fetchAllPurposes(client, { logger });
    purposeIdByTrackingType = Object.fromEntries(
      purposes.map(({ trackingType, id }) => [trackingType, id]),
    );
  }

  // Upsert inline option values so their IDs can be linked to topics
  const existingOptionValues = await fetchAllPreferenceOptionValues(client, { logger });
  const optionIdBySlug: Record<string, string> = Object.fromEntries(
    existingOptionValues.map(({ slug, id }) => [slug, id]),
  );
  const inlineOptions = uniqBy(
    topics.flatMap((topic) => topic.options ?? []),
    'slug',
  );
  if (inlineOptions.length > 0) {
    const upserted = await createOrUpdatePreferenceOptionValues(
      client,
      inlineOptions.map((optionValue) => [optionValue, optionIdBySlug[optionValue.slug]]),
      { logger },
    );
    upserted.forEach(({ slug, id }) => {
      optionIdBySlug[slug] = id;
    });
  }

  // Existing topics for matching updates
  const existingTopics = await fetchAllPreferenceTopics(client, { logger });
  const topicBySlugKey = keyBy(
    existingTopics,
    ({ purpose, slug }) => `${purpose.trackingType}:${slug}`,
  );

  let success = true;
  for (const topic of topics) {
    const trackingType = topic['tracking-type'];
    const purposeId = purposeIdByTrackingType[trackingType];
    if (!purposeId) {
      success = false;
      logger?.error(
        `Failed to sync preference topic "${topic.title}"! - unknown purpose "${trackingType}"`,
      );
      continue;
    }

    const existing = topicBySlugKey[`${trackingType}:${topic.slug}`];

    const preferenceOptionValueIds = (topic.options ?? [])
      .map((optionValue) => optionIdBySlug[optionValue.slug])
      .filter((id): id is string => Boolean(id));

    try {
      await makeGraphQLRequest(client, CREATE_OR_UPDATE_PREFERENCE_TOPIC, {
        variables: {
          input: {
            id: existing?.id,
            title: topic.title,
            slug: topic.slug,
            type: topic.type,
            displayDescription: topic.description,
            showInPrivacyCenter: topic['show-in-privacy-center'],
            defaultConfiguration: topic['default-configuration'],
            purposeId,
            preferenceOptionValueIds:
              preferenceOptionValueIds.length > 0 ? preferenceOptionValueIds : undefined,
          },
        },
        logger,
      });
    } catch (err) {
      success = false;
      logger?.error(
        `Failed to sync preference topic "${topic.title}"! - ${(err as Error).message}`,
      );
    }
  }

  if (success) {
    logger?.info(`Successfully synced "${topics.length}" preference topics!`);
  }
  return success;
}

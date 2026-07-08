import { PreferenceTopicType } from '@transcend-io/privacy-types';
import { type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy, uniqBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { type PreferenceTopicSyncInput } from './codecs.js';
import { fetchAllPreferenceOptionValues } from './fetchAllPreferenceOptionValues.js';
import { fetchAllPreferenceTopics } from './fetchAllPreferenceTopics.js';
import { fetchAllPurposes } from './fetchAllPurposes.js';
import { CREATE_OR_UPDATE_PREFERENCE_TOPIC } from './gqls/preferenceTopic.js';
import { createOrUpdatePreferenceOptionValues } from './syncPreferenceOptionValues.js';

export type { PreferenceTopicSyncInput } from './codecs.js';

/**
 * Build GraphQL input for creating a preference topic.
 *
 * @param topic - Topic input from YAML
 * @param purposeId - Resolved purpose ID
 * @param preferenceOptionValueIds - Linked option value IDs (omit for BOOLEAN)
 * @returns Mutation input with only the fields allowed on create
 */
function buildCreatePreferenceTopicInput(
  topic: PreferenceTopicSyncInput,
  purposeId: string,
  preferenceOptionValueIds: string[],
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    title: topic.title,
    slug: topic.slug,
    type: topic.type,
    displayDescription: topic.description,
    purposeId,
  };
  if (topic['show-in-privacy-center'] !== undefined) {
    input.showInPrivacyCenter = topic['show-in-privacy-center'];
  }
  if (topic['default-configuration'] !== undefined) {
    input.defaultConfiguration = topic['default-configuration'];
  }
  if (topic.type !== PreferenceTopicType.Boolean && preferenceOptionValueIds.length > 0) {
    input.preferenceOptionValueIds = preferenceOptionValueIds;
  }
  return input;
}

/**
 * Build GraphQL input for updating an existing preference topic.
 * Slug, type, and purposeId must be omitted — the backend rejects them on update.
 *
 * @param existingId - ID of the existing topic
 * @param topic - Topic input from YAML
 * @param preferenceOptionValueIds - Linked option value IDs (omit for BOOLEAN)
 * @returns Mutation input with only the fields allowed on update
 */
function buildUpdatePreferenceTopicInput(
  existingId: string,
  topic: PreferenceTopicSyncInput,
  preferenceOptionValueIds: string[],
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    id: existingId,
    title: topic.title,
    displayDescription: topic.description,
  };
  if (topic['show-in-privacy-center'] !== undefined) {
    input.showInPrivacyCenter = topic['show-in-privacy-center'];
  }
  if (topic['default-configuration'] !== undefined) {
    input.defaultConfiguration = topic['default-configuration'];
  }
  if (topic.type !== PreferenceTopicType.Boolean && preferenceOptionValueIds.length > 0) {
    input.preferenceOptionValueIds = preferenceOptionValueIds;
  }
  return input;
}

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
  topics: PreferenceTopicSyncInput[],
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
    topics
      .filter((topic) => topic.type !== PreferenceTopicType.Boolean)
      .flatMap((topic) => topic.options ?? []),
    'slug',
  ).filter((optionValue) => {
    const found = existingOptionValues.find(({ slug }) => slug === optionValue.slug);
    return !found || found.title.defaultMessage !== optionValue.title;
  });
  if (inlineOptions.length > 0) {
    try {
      const upserted = await createOrUpdatePreferenceOptionValues(
        client,
        inlineOptions.map((optionValue) => [optionValue, optionIdBySlug[optionValue.slug]]),
        { logger },
      );
      upserted.forEach(({ slug, id }) => {
        optionIdBySlug[slug] = id;
      });
    } catch (err) {
      logger?.error(`Failed to sync inline preference option values! - ${(err as Error).message}`);
      return false;
    }
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

    if (topic.type === PreferenceTopicType.Boolean && (topic.options ?? []).length > 0) {
      success = false;
      logger?.error(
        `Failed to sync preference topic "${topic.title}"! - BOOLEAN preference topics cannot have options in YAML (the backend auto-creates True/False options)`,
      );
      continue;
    }

    const existing = topicBySlugKey[`${trackingType}:${topic.slug}`];

    if (existing && existing.type !== topic.type) {
      success = false;
      logger?.error(
        `Failed to sync preference topic "${topic.title}"! - Cannot change preference topic type from "${existing.type}" to "${topic.type}" for an existing topic`,
      );
      continue;
    }

    const preferenceOptionValueIds =
      topic.type === PreferenceTopicType.Boolean
        ? []
        : (topic.options ?? [])
            .map((optionValue) => optionIdBySlug[optionValue.slug])
            .filter((id): id is string => Boolean(id));

    try {
      const input = existing
        ? buildUpdatePreferenceTopicInput(existing.id, topic, preferenceOptionValueIds)
        : buildCreatePreferenceTopicInput(topic, purposeId, preferenceOptionValueIds);

      await makeGraphQLRequest(client, CREATE_OR_UPDATE_PREFERENCE_TOPIC, {
        variables: { input },
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

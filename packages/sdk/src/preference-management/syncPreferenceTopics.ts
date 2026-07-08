import { PreferenceTopicType } from '@transcend-io/privacy-types';
import { map, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  fetchAllPreferenceOptionValues,
  type PreferenceOptionValue,
} from './fetchAllPreferenceOptionValues.js';
import { fetchAllPreferenceTopics, type PreferenceTopic } from './fetchAllPreferenceTopics.js';
import { fetchAllPurposes, type Purpose } from './fetchAllPurposes.js';
import { CREATE_OR_UPDATE_PREFERENCE_TOPIC } from './gqls/preferenceTopicMutations.js';

export interface ConsentPreferenceTopicOptionValueInput {
  /** Title of option value */
  title: string;
  /** API slug */
  slug: string;
}

export interface ConsentPreferenceTopicSyncInput {
  /** The type of the preference topic */
  type: PreferenceTopicType;
  /** The title of the preference topic */
  title: string;
  /** The description of the preference topic */
  description: string;
  /** Purpose tracking type slug this topic belongs to */
  'tracking-type': string;
  /** API slug for the preference topic */
  slug?: string;
  /** Default value */
  'default-configuration'?: string;
  /** Whether the preference topic is shown in privacy center */
  'show-in-privacy-center'?: boolean;
  /** The options when type is single or multi select */
  options?: ConsentPreferenceTopicOptionValueInput[];
}

function topicLookupKey(trackingType: string, slugOrTitle: string): string {
  return `${trackingType}:${slugOrTitle}`;
}

/**
 * Sync preference topics to Transcend
 *
 * @param client - GraphQL client
 * @param inputs - Preference topic inputs from YAML
 * @param options - Options
 * @returns True if run without error
 */
export async function syncPreferenceTopics(
  client: GraphQLClient,
  inputs: ConsentPreferenceTopicSyncInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Concurrency for uploads */
    concurrency?: number;
  } = {},
): Promise<boolean> {
  const { logger, concurrency = 20 } = options;
  logger?.info(`Syncing "${inputs.length}" preference topics...`);

  let encounteredError = false;

  const [existingTopics, purposes, optionValues] = await Promise.all([
    fetchAllPreferenceTopics(client, { logger }),
    fetchAllPurposes(client, { logger }),
    fetchAllPreferenceOptionValues(client, { logger }),
  ]);

  const purposeByTrackingType = keyBy(purposes, 'trackingType') as Record<string, Purpose>;
  const optionValuesBySlug = keyBy(optionValues, 'slug') as Record<string, PreferenceOptionValue>;
  const topicsByKey = keyBy(existingTopics, (topic) =>
    topicLookupKey(topic.purpose.trackingType, topic.slug),
  ) as Record<string, PreferenceTopic>;
  const topicsByTitleKey = keyBy(existingTopics, (topic) =>
    topicLookupKey(topic.purpose.trackingType, topic.title.defaultMessage),
  ) as Record<string, PreferenceTopic>;

  await map(
    inputs,
    async (topic) => {
      const trackingType = topic['tracking-type'];
      const purpose = purposeByTrackingType[trackingType];
      if (!purpose) {
        throw new Error(`Purpose with tracking type "${trackingType}" not found.`);
      }

      const lookupSlug = topic.slug ?? topic.title;
      const existingTopic =
        topicsByKey[topicLookupKey(trackingType, lookupSlug)] ??
        topicsByTitleKey[topicLookupKey(trackingType, topic.title)];

      try {
        await makeGraphQLRequest(client, CREATE_OR_UPDATE_PREFERENCE_TOPIC, {
          variables: {
            input: {
              type: topic.type,
              title: topic.title,
              ...(topic.slug ? { slug: topic.slug } : {}),
              showInPrivacyCenter: topic['show-in-privacy-center'],
              purposeId: purpose.id,
              ...(topic.options
                ? {
                    preferenceOptionValueIds: topic.options.map((option) => {
                      const result = optionValuesBySlug[option.slug];
                      if (!result) {
                        throw new Error(
                          `Preference option value with slug "${option.slug}" not found.`,
                        );
                      }
                      return result.id;
                    }),
                  }
                : {}),
              ...(existingTopic ? { id: existingTopic.id } : {}),
              displayDescription: topic.description,
              defaultConfiguration: topic['default-configuration'],
            },
          },
          logger,
        });
      } catch (err) {
        encounteredError = true;
        logger?.error(
          `Failed to sync preference topic "${topic.title}" (${trackingType})! - ${(err as Error).message}`,
        );
      }
    },
    { concurrency },
  );

  if (!encounteredError) {
    logger?.info(`Successfully synced "${inputs.length}" preference topics!`);
  }
  return !encounteredError;
}

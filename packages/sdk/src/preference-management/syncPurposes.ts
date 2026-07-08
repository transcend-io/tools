import { UserPrivacySignalEnum } from '@transcend-io/airgap.js-types';
import {
  DefaultConsentOption,
  PreferenceStoreAuthLevel,
  PreferenceTopicType,
} from '@transcend-io/privacy-types';
import { map, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import {
  fetchAllPreferenceOptionValues,
  type PreferenceOptionValue,
} from './fetchAllPreferenceOptionValues.js';
import { type PreferenceTopic } from './fetchAllPreferenceTopics.js';
import {
  fetchAllPurposesAndPreferences,
  type PurposeWithPreferences,
} from './fetchAllPurposesAndPreferences.js';
import { CREATE_OR_UPDATE_PREFERENCE_TOPIC } from './gqls/preferenceTopicMutations.js';
import { CREATE_PURPOSE, UPDATE_PURPOSE } from './gqls/purposeMutations.js';

export interface ConsentPreferenceTopicOptionValueInput {
  /** Title of option value */
  title: string;
  /** API slug */
  slug: string;
}

export interface ConsentPreferenceTopicInput {
  /** The type of the preference topic */
  type: PreferenceTopicType;
  /** The title of the preference topic */
  title: string;
  /** The description of the preference topic */
  description: string;
  /** Default value */
  'default-configuration'?: string;
  /** Whether the preference topic is shown in privacy center */
  'show-in-privacy-center'?: boolean;
  /** The options when type is single or multi select */
  options?: ConsentPreferenceTopicOptionValueInput[];
}

export interface ConsentPurposeSyncInput {
  /** Consent purpose slug */
  trackingType: string;
  /** The title of the tracking purpose */
  title: string;
  /** The display name of this tracking purpose */
  name: string;
  /** Description of purpose */
  description?: string;
  /** Whether purpose is active */
  'is-active'?: boolean;
  /** Whether purpose is configurable */
  configurable?: boolean;
  /** Display order of purpose for privacy center */
  'display-order'?: number;
  /** Whether purpose is shown in privacy center */
  'show-in-privacy-center'?: boolean;
  /** Whether purpose is show in consent manager */
  'show-in-consent-manager'?: boolean;
  /** The preference topics configured for the purpose */
  'preference-topics'?: ConsentPreferenceTopicInput[];
  /** Authentication level for purpose on privacy center */
  'auth-level'?: PreferenceStoreAuthLevel;
  /** Opt out signals that should instantly opt out of this purpose */
  'opt-out-signals'?: UserPrivacySignalEnum[];
  /** Default consent value (pull-only today; not sent on create/update) */
  'default-consent'?: DefaultConsentOption;
}

interface PreferenceTopicSyncOptions {
  /** Purpose ID */
  purposeId: string;
  /** Preference option values indexed by slug */
  optionValuesBySlug: Record<string, PreferenceOptionValue>;
  /** Existing preference topics indexed by title */
  topicsByTitle: Record<string, PreferenceTopic>;
  /** Concurrency for upload */
  concurrency: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Create or update preference topics for a purpose
 *
 * @param client - GraphQL client
 * @param topics - Preference topics to create or update
 * @param options - Options
 */
async function createOrUpdatePreferenceTopics(
  client: GraphQLClient,
  topics: ConsentPreferenceTopicInput[],
  {
    purposeId,
    optionValuesBySlug,
    topicsByTitle,
    concurrency = 20,
    logger,
  }: PreferenceTopicSyncOptions,
): Promise<void> {
  await map(
    topics,
    async (topic) => {
      const existingTopic = topicsByTitle[topic.title];
      await makeGraphQLRequest(client, CREATE_OR_UPDATE_PREFERENCE_TOPIC, {
        variables: {
          input: {
            type: topic.type,
            title: topic.title,
            showInPrivacyCenter: topic['show-in-privacy-center'],
            purposeId,
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
    },
    { concurrency },
  );
}

/**
 * Create a new purpose
 *
 * @param client - GraphQL client
 * @param input - Purpose input
 * @param options - Options for syncing preference topics
 * @returns Purpose ID
 */
async function createPurposeRecord(
  client: GraphQLClient,
  input: ConsentPurposeSyncInput,
  options: Omit<PreferenceTopicSyncOptions, 'purposeId' | 'topicsByTitle'>,
): Promise<string> {
  const { logger } = options;
  const {
    createPurpose: { trackingPurpose },
  } = await makeGraphQLRequest<{
    /** createPurpose mutation */
    createPurpose: {
      /** Purpose */
      trackingPurpose: {
        /** ID */
        id: string;
      };
    };
  }>(client, CREATE_PURPOSE, {
    variables: {
      input: {
        trackingType: input.trackingType,
        showInPrivacyCenter: input['show-in-privacy-center'],
        showInConsentManager: input['show-in-consent-manager'],
        optOutSignals: input['opt-out-signals'],
        name: input.title,
        isActive: input['is-active'],
        description: input.description,
        displayOrder: input['display-order'],
        configurable: input.configurable,
        authLevel: input['auth-level'],
      },
    },
    logger,
  });
  logger?.info(`Successfully created purpose "${input.title}"!`);

  if (input['preference-topics'] && input['preference-topics'].length > 0) {
    await createOrUpdatePreferenceTopics(client, input['preference-topics'], {
      ...options,
      purposeId: trackingPurpose.id,
      topicsByTitle: {},
    });
    logger?.info(
      `Successfully synced ${input['preference-topics'].length} preference topics for purpose "${input.title}"!`,
    );
  }
  return trackingPurpose.id;
}

/**
 * Update an existing purpose
 *
 * @param client - GraphQL client
 * @param input - Purpose input
 * @param options - Options for syncing preference topics
 */
async function updatePurposeRecord(
  client: GraphQLClient,
  input: ConsentPurposeSyncInput,
  options: PreferenceTopicSyncOptions,
): Promise<void> {
  const { logger, purposeId } = options;
  await makeGraphQLRequest(client, UPDATE_PURPOSE, {
    variables: {
      input: {
        id: purposeId,
        title: input.title,
        showInPrivacyCenter: input['show-in-privacy-center'],
        showInConsentManager: input['show-in-consent-manager'],
        configurable: input.configurable,
        optOutSignals: input['opt-out-signals'],
        name: input.title,
        isActive: input['is-active'],
        displayOrder: input['display-order'],
        description: input.description,
        authLevel: input['auth-level'],
      },
    },
    logger,
  });
  logger?.info(`Successfully updated purpose: ${purposeId}:${input.title || input.trackingType}!`);

  if (input['preference-topics'] && input['preference-topics'].length > 0) {
    await createOrUpdatePreferenceTopics(client, input['preference-topics'], options);
    logger?.info(
      `Successfully synced ${input['preference-topics'].length} preference topics for purpose "${
        input.title || input.trackingType
      }"!`,
    );
  }
}

/**
 * Sync consent and preference management purposes
 *
 * @param client - GraphQL client
 * @param purposes - Purposes to sync
 * @param options - Options
 * @returns True if run without error
 */
export async function syncPurposes(
  client: GraphQLClient,
  purposes: ConsentPurposeSyncInput[],
  options: {
    /** Concurrency */
    concurrency?: number;
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { concurrency = 20, logger } = options;
  let encounteredError = false;
  logger?.info(`Syncing "${purposes.length}" purposes...`);

  const [existing, existingOptions] = await Promise.all([
    fetchAllPurposesAndPreferences(client, { logger }),
    fetchAllPreferenceOptionValues(client, { logger }),
  ]);
  const purposeByTrackingType = keyBy(existing, 'trackingType');
  const optionValuesBySlug = keyBy(existingOptions, 'slug');

  const mapPurposesToExisting = purposes.map(
    (purposeInput) => [purposeInput, purposeByTrackingType[purposeInput.trackingType]] as const,
  );

  const newPurposes = mapPurposesToExisting
    .filter(([, existingPurpose]) => !existingPurpose)
    .map(([purposeInput]) => purposeInput);

  try {
    logger?.info(`Creating "${newPurposes.length}" new purposes...`);
    await map(
      newPurposes,
      async (purpose) => {
        await createPurposeRecord(client, purpose, {
          concurrency,
          optionValuesBySlug,
          logger,
        });
      },
      { concurrency },
    );
    logger?.info(`Successfully created ${newPurposes.length} purposes!`);
  } catch (err) {
    encounteredError = true;
    logger?.error(`Failed to create purposes! - ${(err as Error).message}`);
  }

  const existingPurposes = mapPurposesToExisting.filter(
    (entry): entry is [ConsentPurposeSyncInput, PurposeWithPreferences] => !!entry[1],
  );

  try {
    logger?.info(`Updating "${existingPurposes.length}" purposes...`);
    await map(
      existingPurposes,
      async ([purposeInput, existingPurpose]) => {
        try {
          await updatePurposeRecord(client, purposeInput, {
            concurrency,
            optionValuesBySlug,
            purposeId: existingPurpose.id,
            topicsByTitle: keyBy(existingPurpose.topics, (topic) => topic.title.defaultMessage),
            logger,
          });
        } catch (err) {
          encounteredError = true;
          logger?.error(
            `Failed to update purpose "${existingPurpose.id}" (${purposeInput.trackingType})! - ${(err as Error).message}`,
          );
        }
      },
      { concurrency },
    );
    logger?.info(`Successfully updated "${existingPurposes.length}" purposes!`);
  } catch (err) {
    encounteredError = true;
    logger?.error(`Failed to update purposes! - ${(err as Error).message}`);
  }

  logger?.info(`Synced "${purposes.length}" purposes!`);
  return !encounteredError;
}

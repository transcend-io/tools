import { InitialViewState, OnConsentExpiry } from '@transcend-io/airgap.js-types';
import {
  CREATE_CONSENT_EXPERIENCE,
  CREATE_CONSENT_MANAGER,
  fetchAllPurposes,
  fetchConsentManagerExperiences,
  fetchConsentManagerId,
  makeGraphQLRequest,
  TOGGLE_CONSENT_PRECEDENCE,
  TOGGLE_TELEMETRY_PARTITION_STRATEGY,
  TOGGLE_UNKNOWN_COOKIE_POLICY,
  TOGGLE_UNKNOWN_REQUEST_POLICY,
  UPDATE_CONSENT_EXPERIENCE,
  UPDATE_CONSENT_MANAGER_DOMAINS,
  UPDATE_CONSENT_MANAGER_PARTITION,
  UPDATE_CONSENT_MANAGER_THEME,
  UPDATE_CONSENT_MANAGER_VERSION,
  UPDATE_LOAD_OPTIONS,
} from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { ConsentManageExperienceInput, ConsentManagerInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { fetchPrivacyCenterId } from './fetchPrivacyCenterId.js';
import { fetchPartitions } from './syncPartitions.js';

const PURPOSES_LINK = 'https://app.transcend.io/consent-manager/regional-experiences/purposes';

/**
 * Sync consent manager experiences up to Transcend
 *
 * @param client - GraphQL client
 * @param experiences - The experience inputs
 */
export async function syncConsentManagerExperiences(
  client: GraphQLClient,
  experiences: ConsentManageExperienceInput[],
): Promise<void> {
  // Fetch existing experiences and
  const existingExperiences = await fetchConsentManagerExperiences(client, { logger });
  const experienceLookup = keyBy(existingExperiences, 'name');

  // Fetch existing purposes
  const purposes = await fetchAllPurposes(client, { logger });
  const purposeLookup = keyBy(purposes, 'trackingType');

  // Bulk update or create experiences
  await map(
    experiences,
    async (exp, ind) => {
      // Purpose IDs
      const purposeIds = exp.purposes?.map((purpose, ind2) => {
        const existingPurpose = purposeLookup[purpose.trackingType];
        if (!existingPurpose) {
          throw new Error(
            `Invalid purpose trackingType provided at consentManager.experiences[${ind}].purposes[${ind2}]: ` +
              `${purpose.trackingType}. See list of valid purposes ${PURPOSES_LINK}`,
          );
        }
        return existingPurpose.id;
      });
      const optedOutPurposeIds = exp.optedOutPurposes?.map((purpose, ind2) => {
        const existingPurpose = purposeLookup[purpose.trackingType];
        if (!existingPurpose) {
          throw new Error(
            `Invalid purpose trackingType provided at consentManager.experiences[${ind}].optedOutPurposes[${ind2}]: ` +
              `${purpose.trackingType}. See list of valid purposes ${PURPOSES_LINK}`,
          );
        }
        return existingPurpose.id;
      });

      // update experience
      const existingExperience = experienceLookup[exp.name];
      if (existingExperience) {
        await makeGraphQLRequest(client, UPDATE_CONSENT_EXPERIENCE, {
          variables: {
            input: {
              id: existingExperience.id,
              name: exp.displayName,
              regions: exp.regions,
              operator: exp.operator,
              onConsentExpiry: exp.onConsentExpiry,
              consentExpiry: exp.consentExpiry,
              displayPriority:
                exp.displayPriority !== existingExperience.displayPriority
                  ? exp.displayPriority
                  : undefined,
              viewState: exp.viewState,
              purposes: purposeIds,
              optedOutPurposes: optedOutPurposeIds,
              browserLanguages: exp.browserLanguages,
              browserTimeZones: exp.browserTimeZones,
            },
          },
          logger,
        });
        logger.info(colors.green(`Successfully synced consent experience "${exp.name}"!`));
      } else {
        // create new experience
        await makeGraphQLRequest(client, CREATE_CONSENT_EXPERIENCE, {
          variables: {
            input: {
              name: exp.name,
              displayName: exp.displayName,
              regions: exp.regions,
              operator: exp.operator,
              onConsentExpiry: exp.onConsentExpiry || OnConsentExpiry.Prompt,
              consentExpiry: exp.consentExpiry,
              displayPriority: exp.displayPriority,
              viewState: exp.viewState || InitialViewState.Hidden,
              purposes: purposeIds || [],
              optedOutPurposes: optedOutPurposeIds || [],
              browserLanguages: exp.browserLanguages,
              browserTimeZones: exp.browserTimeZones,
            },
          },
          logger,
        });
        logger.info(colors.green(`Successfully created consent experience "${exp.name}"!`));
      }
    },
    {
      concurrency: 10,
    },
  );
}

/**
 * Sync the consent manager
 *
 * @param client - GraphQL client
 * @param consentManager - The consent manager input
 */
export async function syncConsentManager(
  client: GraphQLClient,
  consentManager: ConsentManagerInput,
): Promise<void> {
  let airgapBundleId: string;

  // ensure the consent manager is created and deployed
  try {
    airgapBundleId = await fetchConsentManagerId(client, { logger, maxRequests: 1 });
  } catch (err) {
    // TODO: https://transcend.height.app/T-23778
    if (err.message.includes('AirgapBundle not found')) {
      const privacyCenterId = await fetchPrivacyCenterId(client);

      const { createConsentManager } = await makeGraphQLRequest<{
        /** Create consent manager */
        createConsentManager: {
          /** Consent manager */
          consentManager: {
            /** ID */
            id: string;
          };
        };
      }>(client, CREATE_CONSENT_MANAGER, {
        variables: { domains: consentManager.domains, privacyCenterId },
        logger,
      });
      airgapBundleId = createConsentManager.consentManager.id;
    } else {
      throw err;
    }
  }

  // sync domains
  if (consentManager.domains) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_DOMAINS, {
      variables: { domains: consentManager.domains, airgapBundleId },
      logger,
    });
  }

  // sync partition
  if (consentManager.partition) {
    const partitions = await fetchPartitions(client);
    const partitionToUpdate = partitions.find((part) => part.name === consentManager.partition);
    if (!partitionToUpdate) {
      throw new Error(
        `Partition "${consentManager.partition}" not found. Please create the partition first.`,
      );
    }
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_PARTITION, {
      variables: { partitionId: partitionToUpdate.id, airgapBundleId },
      logger,
    });
  }

  if (consentManager.version) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_VERSION, {
      variables: { airgapBundleId, version: consentManager.version },
      logger,
    });
  }

  // sync signed IAB agreement
  if (consentManager.signedIabAgreement) {
    await makeGraphQLRequest(client, UPDATE_LOAD_OPTIONS, {
      variables: {
        input: {
          id: airgapBundleId,
          ...(consentManager.signedIabAgreement
            ? { signedIabAgreement: consentManager.signedIabAgreement }
            : {}),
        },
      },
      logger,
    });
  }

  // sync default request policy
  if (consentManager.unknownRequestPolicy) {
    await makeGraphQLRequest(client, TOGGLE_UNKNOWN_REQUEST_POLICY, {
      variables: {
        input: {
          id: airgapBundleId,
          unknownRequestPolicy: consentManager.unknownRequestPolicy,
        },
      },
      logger,
    });
  }

  // sync default cookie policy
  if (consentManager.unknownRequestPolicy) {
    await makeGraphQLRequest(client, TOGGLE_UNKNOWN_COOKIE_POLICY, {
      variables: {
        input: {
          id: airgapBundleId,
          unknownCookiePolicy: consentManager.unknownCookiePolicy,
        },
      },
      logger,
    });
  }

  // sync telemetry partition strategy
  if (consentManager.telemetryPartitioning) {
    await makeGraphQLRequest(client, TOGGLE_TELEMETRY_PARTITION_STRATEGY, {
      variables: {
        input: {
          id: airgapBundleId,
          strategy: consentManager.telemetryPartitioning,
        },
      },
      logger,
    });
  }

  // sync telemetry partition strategy
  if (consentManager.consentPrecedence) {
    await makeGraphQLRequest(client, TOGGLE_CONSENT_PRECEDENCE, {
      variables: {
        input: {
          id: airgapBundleId,
          consentPrecedence: consentManager.consentPrecedence,
        },
      },
      logger,
    });
  }

  // Update experience configurations
  if (consentManager.experiences) {
    await syncConsentManagerExperiences(client, consentManager.experiences);
  }

  // update theme
  if (consentManager.theme) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_THEME, {
      variables: {
        input: {
          airgapBundleId,
          ...consentManager.theme,
        },
      },
      logger,
    });
  }

  // TODO: https://transcend.height.app/T-23875
  //  syncEndpoint: string;
  // TODO: https://transcend.height.app/T-23919
  //  syncGroups: string;
}

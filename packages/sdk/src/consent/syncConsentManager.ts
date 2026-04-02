import { InitialViewState, OnConsentExpiry, BrowserLanguage } from '@transcend-io/airgap.js-types';
import {
  ConsentBundleType,
  ConsentPrecedenceOption,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  RegionsOperator,
  UnknownRequestPolicy,
  TelemetryPartitionStrategy,
  SignedIabAgreementOption,
  BrowserTimeZone,
} from '@transcend-io/privacy-types';
import { map, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllPurposes } from '../preference-management/fetchAllPurposes.js';
import { fetchConsentManagerId, fetchConsentManagerExperiences } from './fetchConsentManagerId.js';
import { fetchPrivacyCenterId, fetchPrivacyCenterUrl } from './fetchPrivacyCenterId.js';
import {
  UPDATE_CONSENT_MANAGER_DOMAINS,
  CREATE_CONSENT_MANAGER,
  UPDATE_LOAD_OPTIONS,
  UPDATE_CONSENT_MANAGER_PARTITION,
  UPDATE_CONSENT_MANAGER_VERSION,
  TOGGLE_TELEMETRY_PARTITION_STRATEGY,
  TOGGLE_UNKNOWN_COOKIE_POLICY,
  TOGGLE_CONSENT_PRECEDENCE,
  TOGGLE_UNKNOWN_REQUEST_POLICY,
  UPDATE_CONSENT_EXPERIENCE,
  CREATE_CONSENT_EXPERIENCE,
  UPDATE_CONSENT_MANAGER_THEME,
} from './gqls/consentManager.js';
import { fetchPartitions } from './syncPartitions.js';

const PURPOSES_LINK = 'https://app.transcend.io/consent-manager/regional-experiences/purposes';

export interface ConsentManageExperienceInput {
  /** Name of experience */
  name: string;
  /** Display name of experience */
  displayName?: string;
  /** Regions that define this regional experience */
  regions?: {
    /** Country */
    country?: IsoCountryCode;
    /** Country subdivision */
    countrySubDivision?: IsoCountrySubdivisionCode;
  }[];
  /** How to handle consent expiry */
  onConsentExpiry?: OnConsentExpiry;
  /** Consent expiration value */
  consentExpiry?: number;
  /** In vs not in operator */
  operator?: RegionsOperator;
  /** Priority of experience */
  displayPriority?: number;
  /** View state to prompt when auto prompting is enabled */
  viewState?: InitialViewState;
  /** Purposes that can be opted out of in a particular experience */
  purposes?: {
    /** Slug of purpose */
    trackingType: string;
  }[];
  /** Purposes that are opted out by default in a particular experience */
  optedOutPurposes?: {
    /** Slug of purpose */
    trackingType: string;
  }[];
  /** Browser languages that define this regional experience */
  browserLanguages?: BrowserLanguage[];
  /** Browser time zones that define this regional experience */
  browserTimeZones?: BrowserTimeZone[];
}

export interface ConsentManagerInput {
  /** Airgap version */
  version?: string;
  /** Bundle URLs per bundle type */
  bundleUrls?: Partial<Record<ConsentBundleType, string>>;
  /** The consent manager domains */
  domains?: string[];
  /** Key used to partition consent records */
  partition?: string;
  /** Precedence of signals vs user input */
  consentPrecedence?: ConsentPrecedenceOption;
  /** The consent manager unknown request policy */
  unknownRequestPolicy?: UnknownRequestPolicy;
  /** The consent manager unknown cookie policy */
  unknownCookiePolicy?: UnknownRequestPolicy;
  /** The XDI sync endpoint */
  syncEndpoint?: string;
  /** The telemetry partitioning strategy */
  telemetryPartitioning?: TelemetryPartitionStrategy;
  /** Whether the site owner has signed the IAB agreement */
  signedIabAgreement?: SignedIabAgreementOption;
  /** Regional experience configurations */
  experiences?: ConsentManageExperienceInput[];
  /** Theme configuration */
  theme?: {
    /** Primary color */
    primaryColor?: string;
    /** Font color */
    fontColor?: string;
    /** Privacy policy URL */
    privacyPolicy?: string;
    /** Auto-prompt setting */
    prompt?: number;
  };
  /** The Shared XDI host sync groups config (JSON) */
  syncGroups?: string;
}

/**
 * Sync consent manager experiences up to Transcend
 *
 * @param client - GraphQL client
 * @param experiences - The experience inputs
 * @param options - Options
 */
export async function syncConsentManagerExperiences(
  client: GraphQLClient,
  experiences: ConsentManageExperienceInput[],
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;

  const existingExperiences = await fetchConsentManagerExperiences(client, {
    logger,
  });
  const experienceLookup = keyBy(existingExperiences, 'name');

  const purposes = await fetchAllPurposes(client, { logger });
  const purposeLookup = keyBy(purposes, 'trackingType');

  await map(
    experiences,
    async (exp, ind) => {
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
        logger.info(`Successfully synced consent experience "${exp.name}"!`);
      } else {
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
        logger.info(`Successfully created consent experience "${exp.name}"!`);
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
 * @param options - Options
 */
export async function syncConsentManager(
  client: GraphQLClient,
  consentManager: ConsentManagerInput,
  options: {
    /** Logger instance */
    logger: Logger;
  },
): Promise<void> {
  const { logger } = options;
  let airgapBundleId: string;

  try {
    airgapBundleId = await fetchConsentManagerId(client, {
      logger,
      maxRequests: 1,
    });
  } catch (err) {
    // TODO: https://transcend.height.app/T-23778
    if ((err as Error).message.includes('AirgapBundle not found')) {
      const privacyCenterId = await fetchPrivacyCenterId(client, {
        logger,
      });

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
        variables: { privacyCenterId },
        logger,
      });
      airgapBundleId = createConsentManager.consentManager.id;
    } else {
      throw err;
    }
  }

  if (consentManager.domains) {
    await makeGraphQLRequest(client, UPDATE_CONSENT_MANAGER_DOMAINS, {
      variables: { domains: consentManager.domains, airgapBundleId },
      logger,
    });
  }

  if (consentManager.partition) {
    const partitions = await fetchPartitions(client, { logger });
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

  if (consentManager.experiences) {
    await syncConsentManagerExperiences(client, consentManager.experiences, {
      logger,
    });
  }

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

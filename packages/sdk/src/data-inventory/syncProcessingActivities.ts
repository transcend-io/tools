import type {
  ProcessingPurpose,
  DataCategoryType,
  DataProtectionImpactAssessmentStatus,
  Controllership,
  RetentionType,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
} from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import {
  fetchAllProcessingActivities,
  type ProcessingActivity,
} from './fetchAllProcessingActivities.js';
import {
  UPDATE_PROCESSING_ACTIVITIES,
  CREATE_PROCESSING_ACTIVITY,
} from './gqls/processingActivity.js';

export interface ProcessingActivityInput {
  /** The title of the processing activity */
  title: string;
  /** Description of the processing activity */
  description?: string;
  /** Security measure details */
  securityMeasureDetails?: string;
  /** Controllerships */
  controllerships?: Controllership[];
  /** Storage regions */
  storageRegions?: {
    /** The country */
    country?: IsoCountryCode;
    /** The country subdivision */
    countrySubDivision?: IsoCountrySubdivisionCode;
  }[];
  /** Transfer regions */
  transferRegions?: {
    /** The country */
    country?: IsoCountryCode;
    /** The country subdivision */
    countrySubDivision?: IsoCountrySubdivisionCode;
  }[];
  /** Retention type */
  retentionType?: RetentionType;
  /** Retention period in days */
  retentionPeriod?: number;
  /** Data protection impact assessment link */
  dataProtectionImpactAssessmentLink?: string;
  /** Data protection impact assessment status */
  dataProtectionImpactAssessmentStatus?: DataProtectionImpactAssessmentStatus;
  /** Attribute value and its corresponding attribute key */
  attributes?: {
    /** Attribute key */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
  /** Data silo titles */
  dataSiloTitles?: string[];
  /** Data subject types */
  dataSubjectTypes?: string[];
  /** Team names */
  teamNames?: string[];
  /** Owner emails */
  ownerEmails?: string[];
  /** Processing sub purposes */
  processingSubPurposes?: {
    /** The parent purpose */
    purpose: ProcessingPurpose;
    /** User-defined name for this processing purpose sub category */
    name?: string;
  }[];
  /** Data sub categories */
  dataSubCategories?: {
    /** The parent category */
    category: DataCategoryType;
    /** User-defined name for this sub category */
    name?: string;
  }[];
  /** SaaS category titles */
  saaSCategories?: string[];
}

/**
 * Create a new processing activity, setting only title and description
 *
 * @param client - GraphQL client
 * @param processingActivity - Input
 * @param options - Options
 * @returns Created processingActivity
 */
async function createProcessingActivity(
  client: GraphQLClient,
  processingActivity: ProcessingActivityInput,
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<Pick<ProcessingActivity, 'id' | 'title'>> {
  const { logger = NOOP_LOGGER } = options;
  const input = {
    title: processingActivity.title,
    description: processingActivity.description,
  };

  const { createProcessingActivity } = await makeGraphQLRequest<{
    /** Create processingActivity mutation */
    createProcessingActivity: {
      /** Created processingActivity */
      processingActivity: ProcessingActivity;
    };
  }>(client, CREATE_PROCESSING_ACTIVITY, {
    variables: { input },
    logger,
  });
  return createProcessingActivity.processingActivity;
}

/**
 * Update a list of processing activities.
 *
 * @param client - GraphQL client
 * @param processingActivityIdPairs - [ProcessingActivityInput, processingActivityId] list
 * @param options - Options
 */
async function updateProcessingActivities(
  client: GraphQLClient,
  processingActivityIdPairs: [ProcessingActivityInput, string][],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<void> {
  const { logger = NOOP_LOGGER } = options;
  const invalidProcessingActivityTitles = processingActivityIdPairs
    .filter(([, id]) => id === undefined)
    .map(([{ title }]) => title);
  if (invalidProcessingActivityTitles.length > 0) {
    throw new Error(
      `The following ${
        invalidProcessingActivityTitles.length
      } processing activities do not exist and thus can't be updated: "${invalidProcessingActivityTitles.join(
        '", "',
      )}"`,
    );
  }
  await makeGraphQLRequest(client, UPDATE_PROCESSING_ACTIVITIES, {
    variables: {
      input: {
        processingActivities: processingActivityIdPairs.map(
          ([
            { processingSubPurposes, dataSubCategories, saaSCategories, ...processingActivity },
            id,
          ]) => ({
            dataSubCategoryInputs: dataSubCategories?.map(({ category, name }) => ({
              category,
              name: name ?? '',
            })),
            processingPurposeSubCategoryInputs: processingSubPurposes?.map(({ purpose, name }) => ({
              purpose,
              name: name ?? 'Other',
            })),
            saaSCategoryTitles: saaSCategories,
            ...processingActivity,
            id,
          }),
        ),
      },
    },
    logger,
  });
}

/**
 * Sync the data inventory processing activities
 *
 * @param client - GraphQL client
 * @param inputs - Inputs to create
 * @param options - Options
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncProcessingActivities(
  client: GraphQLClient,
  inputs: ProcessingActivityInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger = NOOP_LOGGER } = options;
  let encounteredError = false;

  // Fetch existing
  logger.info(`Syncing "${inputs.length}" processing activities...`);
  const existingProcessingActivities = await fetchAllProcessingActivities(client, { logger });

  // Look up by title
  const processingActivityByTitle: Record<string, Pick<ProcessingActivity, 'id' | 'title'>> = keyBy(
    existingProcessingActivities,
    'title',
  );

  // Create new processingActivities
  const newProcessingActivities = inputs.filter((input) => !processingActivityByTitle[input.title]);
  if (newProcessingActivities.length > 0) {
    logger.info(`Creating "${newProcessingActivities.length}" new processing activities...`);
  }
  await mapSeries(newProcessingActivities, async (processingActivity) => {
    try {
      const newProcessingActivity = await createProcessingActivity(client, processingActivity, {
        logger,
      });
      processingActivityByTitle[newProcessingActivity.title] = newProcessingActivity;
      logger.info(`Successfully created processing activity "${processingActivity.title}"!`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to create processing activity "${processingActivity.title}"! - ${(err as Error).message}`,
      );
    }
  });

  // Update all processing activities
  try {
    logger.info(`Updating "${inputs.length}" processing activities!`);
    await updateProcessingActivities(
      client,
      inputs
        .map((input) => [input, processingActivityByTitle[input.title]?.id] as const)
        .filter((x): x is [ProcessingActivityInput, string] => !!x[1]),
      { logger },
    );
    logger.info(`Successfully synced "${inputs.length}" processingActivities!`);
  } catch (err) {
    encounteredError = true;
    logger.error(
      `Failed to sync "${inputs.length}" processingActivities! - ${(err as Error).message}`,
    );
  }

  return !encounteredError;
}

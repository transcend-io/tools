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

import { fetchAllTeams } from '../administration/fetchAllTeams.js';
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
 * Map a transcend.yml processing-activity entry to the GraphQL update shape.
 *
 * @param processingActivity - YAML input
 * @param id - Existing processing activity ID
 * @returns GraphQL UpdateProcessingActivity input fields
 */
export function toProcessingActivityUpdateInput(
  processingActivity: ProcessingActivityInput,
  id: string,
): Record<string, unknown> {
  return {
    id,
    title: processingActivity.title,
    ...(processingActivity.description !== undefined
      ? { description: processingActivity.description }
      : {}),
    ...(processingActivity.securityMeasureDetails !== undefined
      ? { securityMeasureDetails: processingActivity.securityMeasureDetails }
      : {}),
    ...(processingActivity.controllerships !== undefined
      ? { controllerships: processingActivity.controllerships }
      : {}),
    ...(processingActivity.storageRegions !== undefined
      ? { storageRegions: processingActivity.storageRegions }
      : {}),
    ...(processingActivity.transferRegions !== undefined
      ? { transferRegions: processingActivity.transferRegions }
      : {}),
    ...(processingActivity.retentionType !== undefined
      ? { retentionType: processingActivity.retentionType }
      : {}),
    ...(processingActivity.retentionPeriod !== undefined
      ? { retentionPeriod: processingActivity.retentionPeriod }
      : {}),
    ...(processingActivity.dataProtectionImpactAssessmentLink !== undefined
      ? {
          dataProtectionImpactAssessmentLink: processingActivity.dataProtectionImpactAssessmentLink,
        }
      : {}),
    ...(processingActivity.dataProtectionImpactAssessmentStatus !== undefined
      ? {
          dataProtectionImpactAssessmentStatus:
            processingActivity.dataProtectionImpactAssessmentStatus,
        }
      : {}),
    ...(processingActivity.attributes !== undefined
      ? { attributes: processingActivity.attributes }
      : {}),
    ...(processingActivity.dataSiloTitles !== undefined
      ? { dataSiloTitles: processingActivity.dataSiloTitles }
      : {}),
    ...(processingActivity.dataSubjectTypes !== undefined
      ? { dataSubjectTypes: processingActivity.dataSubjectTypes }
      : {}),
    ...(processingActivity.teamNames !== undefined
      ? { teamNames: processingActivity.teamNames }
      : {}),
    ...(processingActivity.ownerEmails !== undefined
      ? { ownerEmails: processingActivity.ownerEmails }
      : {}),
    ...(processingActivity.dataSubCategories !== undefined
      ? {
          dataSubCategoryInputs: processingActivity.dataSubCategories.map(({ category, name }) => ({
            category,
            name: name ?? '',
          })),
        }
      : {}),
    ...(processingActivity.processingSubPurposes !== undefined
      ? {
          processingPurposeSubCategoryInputs: processingActivity.processingSubPurposes.map(
            ({ purpose, name }) => ({
              purpose,
              name: name ?? 'Other',
            }),
          ),
        }
      : {}),
    ...(processingActivity.saaSCategories !== undefined
      ? { saaSCategoryTitles: processingActivity.saaSCategories }
      : {}),
  };
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
        processingActivities: processingActivityIdPairs.map(([processingActivity, id]) =>
          toProcessingActivityUpdateInput(processingActivity, id),
        ),
      },
    },
    logger,
  });
}

/**
 * Soft-warn on teamNames that do not exist in the organization.
 * Unresolved names are dropped from the update payload so GraphQL does not hard-fail.
 *
 * @param inputs - Processing activity YAML inputs
 * @param existingTeamNames - Team names already present in the org
 * @param logger - Logger
 * @returns Inputs with unresolved teamNames filtered out
 */
export function filterUnresolvedTeamNames(
  inputs: ProcessingActivityInput[],
  existingTeamNames: Set<string>,
  logger: Logger,
): ProcessingActivityInput[] {
  return inputs.map((input) => {
    const teamNames = input.teamNames;
    if (!teamNames || teamNames.length === 0) {
      return input;
    }

    const resolved: string[] = [];
    const unresolved: string[] = [];
    for (const name of teamNames) {
      if (existingTeamNames.has(name)) {
        resolved.push(name);
      } else {
        unresolved.push(name);
      }
    }

    if (unresolved.length > 0) {
      logger.warn(
        `Processing activity "${input.title}": unresolved teamNames skipped: "${unresolved.join(
          '", "',
        )}". Create these teams first or remove them from transcend.yml.`,
      );
    }

    return {
      ...input,
      teamNames: resolved.length > 0 ? resolved : undefined,
    };
  });
}

/**
 * Sync the data inventory processing activities.
 * Idempotent by title: creates missing activities (title + description only),
 * then updates all relationships via updateProcessingActivities.
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

  if (inputs.length === 0) {
    return true;
  }

  // Fetch existing
  logger.info(`Syncing "${inputs.length}" processing activities...`);
  const [existingProcessingActivities, existingTeams] = await Promise.all([
    fetchAllProcessingActivities(client, { logger }),
    inputs.some((input) => (input.teamNames?.length ?? 0) > 0)
      ? fetchAllTeams(client, { logger })
      : Promise.resolve([]),
  ]);

  const existingTeamNames = new Set(existingTeams.map((team) => team.name));
  const inputsWithResolvedTeams = filterUnresolvedTeamNames(inputs, existingTeamNames, logger);

  // Look up by title (idempotency key)
  const processingActivityByTitle: Record<string, Pick<ProcessingActivity, 'id' | 'title'>> = keyBy(
    existingProcessingActivities,
    'title',
  );

  // Create new processingActivities (CreateProcessingActivityInput: title + description only)
  const newProcessingActivities = inputsWithResolvedTeams.filter(
    (input) => !processingActivityByTitle[input.title],
  );
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

  // Update all processing activities (relationships: sub-purposes, categories, regions, teams, etc.)
  try {
    logger.info(`Updating "${inputsWithResolvedTeams.length}" processing activities!`);
    await updateProcessingActivities(
      client,
      inputsWithResolvedTeams
        .map((input) => [input, processingActivityByTitle[input.title]?.id] as const)
        .filter((x): x is [ProcessingActivityInput, string] => !!x[1]),
      { logger },
    );
    logger.info(`Successfully synced "${inputsWithResolvedTeams.length}" processingActivities!`);
  } catch (err) {
    encounteredError = true;
    logger.error(
      `Failed to sync "${inputsWithResolvedTeams.length}" processingActivities! - ${(err as Error).message}`,
    );
  }

  return !encounteredError;
}

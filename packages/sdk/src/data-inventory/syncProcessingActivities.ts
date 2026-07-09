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
  'security-measure-details'?: string;
  /** Controllerships */
  controllerships?: Controllership[];
  /** Storage regions */
  'storage-regions'?: {
    /** The country */
    country?: IsoCountryCode;
    /** The country subdivision */
    countrySubDivision?: IsoCountrySubdivisionCode;
  }[];
  /** Transfer regions */
  'transfer-regions'?: {
    /** The country */
    country?: IsoCountryCode;
    /** The country subdivision */
    countrySubDivision?: IsoCountrySubdivisionCode;
  }[];
  /** Retention type */
  'retention-type'?: RetentionType;
  /** Retention period in days */
  'retention-period'?: number;
  /** Data protection impact assessment link */
  'data-protection-impact-assessment-link'?: string;
  /** Data protection impact assessment status */
  'data-protection-impact-assessment-status'?: DataProtectionImpactAssessmentStatus;
  /** Attribute value and its corresponding attribute key */
  attributes?: {
    /** Attribute key */
    key: string;
    /** Attribute values */
    values: string[];
  }[];
  /** Data silo titles */
  'data-silo-titles'?: string[];
  /** Data subject types */
  'data-subject-types'?: string[];
  /** Team names */
  'team-names'?: string[];
  /** Owner emails */
  'owner-emails'?: string[];
  /** Processing sub purposes */
  'processing-sub-purposes'?: {
    /** The parent purpose */
    purpose: ProcessingPurpose;
    /** User-defined name for this processing purpose sub category */
    name?: string;
  }[];
  /** Data sub categories */
  'data-sub-categories'?: {
    /** The parent category */
    category: DataCategoryType;
    /** User-defined name for this sub category */
    name?: string;
  }[];
  /** SaaS category titles */
  'saas-categories'?: string[];
}

/**
 * Map a transcend.yml processing-activity entry to the GraphQL update shape.
 *
 * @param processingActivity - YAML input (kebab-case keys)
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
    ...(processingActivity['security-measure-details'] !== undefined
      ? { securityMeasureDetails: processingActivity['security-measure-details'] }
      : {}),
    ...(processingActivity.controllerships !== undefined
      ? { controllerships: processingActivity.controllerships }
      : {}),
    ...(processingActivity['storage-regions'] !== undefined
      ? { storageRegions: processingActivity['storage-regions'] }
      : {}),
    ...(processingActivity['transfer-regions'] !== undefined
      ? { transferRegions: processingActivity['transfer-regions'] }
      : {}),
    ...(processingActivity['retention-type'] !== undefined
      ? { retentionType: processingActivity['retention-type'] }
      : {}),
    ...(processingActivity['retention-period'] !== undefined
      ? { retentionPeriod: processingActivity['retention-period'] }
      : {}),
    ...(processingActivity['data-protection-impact-assessment-link'] !== undefined
      ? {
          dataProtectionImpactAssessmentLink:
            processingActivity['data-protection-impact-assessment-link'],
        }
      : {}),
    ...(processingActivity['data-protection-impact-assessment-status'] !== undefined
      ? {
          dataProtectionImpactAssessmentStatus:
            processingActivity['data-protection-impact-assessment-status'],
        }
      : {}),
    ...(processingActivity.attributes !== undefined
      ? { attributes: processingActivity.attributes }
      : {}),
    ...(processingActivity['data-silo-titles'] !== undefined
      ? { dataSiloTitles: processingActivity['data-silo-titles'] }
      : {}),
    ...(processingActivity['data-subject-types'] !== undefined
      ? { dataSubjectTypes: processingActivity['data-subject-types'] }
      : {}),
    ...(processingActivity['team-names'] !== undefined
      ? { teamNames: processingActivity['team-names'] }
      : {}),
    ...(processingActivity['owner-emails'] !== undefined
      ? { ownerEmails: processingActivity['owner-emails'] }
      : {}),
    ...(processingActivity['data-sub-categories'] !== undefined
      ? {
          dataSubCategoryInputs: processingActivity['data-sub-categories'].map(
            ({ category, name }) => ({
              category,
              name: name ?? '',
            }),
          ),
        }
      : {}),
    ...(processingActivity['processing-sub-purposes'] !== undefined
      ? {
          processingPurposeSubCategoryInputs: processingActivity['processing-sub-purposes'].map(
            ({ purpose, name }) => ({
              purpose,
              name: name ?? 'Other',
            }),
          ),
        }
      : {}),
    ...(processingActivity['saas-categories'] !== undefined
      ? { saaSCategoryTitles: processingActivity['saas-categories'] }
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
 * Soft-warn on team-names that do not exist in the organization.
 * Unresolved names are dropped from the update payload so GraphQL does not hard-fail.
 *
 * @param inputs - Processing activity YAML inputs
 * @param existingTeamNames - Team names already present in the org
 * @param logger - Logger
 * @returns Inputs with unresolved team-names filtered out
 */
export function filterUnresolvedTeamNames(
  inputs: ProcessingActivityInput[],
  existingTeamNames: Set<string>,
  logger: Logger,
): ProcessingActivityInput[] {
  return inputs.map((input) => {
    const teamNames = input['team-names'];
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
        `Processing activity "${input.title}": unresolved team-names skipped: "${unresolved.join(
          '", "',
        )}". Create these teams first or remove them from transcend.yml.`,
      );
    }

    return {
      ...input,
      'team-names': resolved.length > 0 ? resolved : undefined,
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
    inputs.some((input) => (input['team-names']?.length ?? 0) > 0)
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

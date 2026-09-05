import {
  AssessmentFormTemplateSource,
  AssessmentFormTemplateStatus,
} from '@transcend-io/privacy-types';
import {
  makeGraphQLRequest,
  type AssessmentSection,
  type RetentionSchedule,
  type UserPreview,
} from '@transcend-io/sdk';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { logger } from '../../logger.js';
import { ASSESSMENT_TEMPLATES } from './gqls/index.js';

/** Runtime dependencies for fetching assessment templates. */
export interface FetchAllAssessmentTemplatesDependencies {
  /** Logger used for GraphQL request diagnostics. */
  readonly logger: Logger;
}

const defaultDependencies: FetchAllAssessmentTemplatesDependencies = {
  logger,
};

/**
 * Represents an assessment template with various properties and metadata.
 */
export interface AssessmentTemplate {
  /** The ID of the assessment template */
  id: string;
  /** The user who created the assessment template */
  creator: UserPreview;
  /** The user who last edited the assessment template */
  lastEditor: UserPreview;
  /** The title of the assessment template */
  title: string;
  /** The description of the assessment template */
  description: string;
  /** The current status of the assessment template */
  status: AssessmentFormTemplateStatus;
  /** The source fo the form template */
  source: AssessmentFormTemplateSource;
  /** ID of parent template */
  parentId: string;
  /** Indicates if the assessment template is locked */
  isLocked: boolean;
  /** Indicates if the assessment template is archived */
  isArchived: boolean;
  /** The date when the assessment template was created */
  createdAt: string;
  /** The date when the assessment template was last updated */
  updatedAt: string;
  /** The retention schedule of the assessment template */
  retentionSchedule?: RetentionSchedule;
  /** The sections of the assessment template */
  sections: AssessmentSection[];
}

const PAGE_SIZE = 20;

/**
 * Fetch all assessment templates in the organization
 *
 * @param client - GraphQL client
 * @param dependencies - Runtime dependencies
 * @returns All assessment templates in the organization
 */
export async function fetchAllAssessmentTemplates(
  client: GraphQLClient,
  dependencies: FetchAllAssessmentTemplatesDependencies = defaultDependencies,
): Promise<AssessmentTemplate[]> {
  const assessmentTemplates: AssessmentTemplate[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      assessmentFormTemplates: { nodes },
    } = await makeGraphQLRequest<{
      /** Templates */
      assessmentFormTemplates: {
        /** Nodes */
        nodes: AssessmentTemplate[];
      };
    }>(client, ASSESSMENT_TEMPLATES, {
      variables: { first: PAGE_SIZE, offset },
      logger: dependencies.logger,
    });
    assessmentTemplates.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return assessmentTemplates.sort((a, b) => a.title.localeCompare(b.title));
}

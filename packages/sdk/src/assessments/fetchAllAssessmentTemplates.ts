import {
  AssessmentFormTemplateSource,
  AssessmentFormTemplateStatus,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import type { AssessmentSection, RetentionSchedule, UserPreview } from './fetchAllAssessments.js';
import { ASSESSMENT_TEMPLATES } from './gqls/assessmentTemplate.js';

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
  /** The source of the form template */
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
 * @param options - Options
 * @returns All assessment templates in the organization
 */
export async function fetchAllAssessmentTemplates(
  client: GraphQLClient,
  options: {
    /** Filter criteria */
    filterBy?: Record<string, unknown>;
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<AssessmentTemplate[]> {
  const { filterBy, logger = NOOP_LOGGER } = options;
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
      variables: { first: PAGE_SIZE, offset, filterBy },
      logger,
    });
    assessmentTemplates.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return assessmentTemplates.sort((a, b) => a.title.localeCompare(b.title));
}

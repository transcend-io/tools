import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { WORKFLOW_CONFIGS } from './gqls/workflowConfig.js';

export interface WorkflowConfig {
  /** Workflow config ID */
  id: string;
  /** Title */
  title: string;
  /** Subtitle */
  subtitle: string | null;
  /** Description */
  description: string | null;
  /** Internal name */
  internalName: string | null;
  /** Visibility tier */
  workflowConfigVisibility: string;
  /** Workflow type (DSR or PREFERENCE_MANAGEMENT) */
  workflowConfigType: string;
  /** Region allow list */
  regionList: string[];
  /** Request action */
  action: {
    /** Action type */
    type: string;
  };
  /** Data subject */
  subject: {
    /** Data subject ID */
    id: string;
    /** Data subject type */
    type: string;
  } | null;
}

const PAGE_SIZE = 50;

/**
 * Fetch all workflow configs in the organization
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns All workflow configs
 */
export async function fetchAllWorkflowConfigs(
  client: GraphQLClient,
  options: {
    /** Filter by workflow config type */
    workflowConfigType?: string;
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<WorkflowConfig[]> {
  const { logger, workflowConfigType } = options;
  const configs: WorkflowConfig[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      workflows: { nodes },
    } = await makeGraphQLRequest<{
      /** Workflows */
      workflows: {
        /** List */
        nodes: {
          /** ID */
          id: string;
          /** Title */
          title: { defaultMessage: string };
          /** Subtitle */
          subtitle: { defaultMessage: string } | null;
          /** Description */
          description: { defaultMessage: string } | null;
          /** Internal name */
          internalName: string | null;
          /** Visibility */
          workflowConfigVisibility: string;
          /** Type */
          workflowConfigType: string;
          /** Regions */
          regionList: string[];
          /** Action */
          action: { type: string };
          /** Subject */
          subject: { id: string; type: string } | null;
        }[];
      };
    }>(client, WORKFLOW_CONFIGS, {
      variables: {
        first: PAGE_SIZE,
        offset,
        filterBy: workflowConfigType ? { workflowConfigType } : undefined,
      },
      logger,
    });

    configs.push(
      ...nodes.map((node) => ({
        id: node.id,
        title: node.title.defaultMessage,
        subtitle: node.subtitle?.defaultMessage ?? null,
        description: node.description?.defaultMessage ?? null,
        internalName: node.internalName,
        workflowConfigVisibility: node.workflowConfigVisibility,
        workflowConfigType: node.workflowConfigType,
        regionList: node.regionList,
        action: node.action,
        subject: node.subject,
      })),
    );
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return configs.sort((a, b) => a.title.localeCompare(b.title));
}

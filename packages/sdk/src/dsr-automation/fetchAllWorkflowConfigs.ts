import { RequestAction, WorkflowConfigType } from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { WORKFLOWS } from './gqls/workflow.js';

export interface WorkflowConfigSummary {
  /** Workflow config ID */
  id: string;
  /** Internal name (preferred display when set) */
  internalName: string | null;
  /** External localized title */
  title: {
    /** Default message for the title */
    defaultMessage: string;
  };
  /** Action associated with this workflow */
  action: {
    /** Action ID */
    id: string;
    /** Action type */
    type: RequestAction;
  };
  /** Data subject associated with this workflow */
  subject: {
    /** Data subject ID */
    id: string;
    /** Data subject type slug */
    type: string;
  } | null;
  /** Workflow config type */
  workflowConfigType: WorkflowConfigType;
}

const PAGE_SIZE = 50;

/**
 * Display title for a workflow config, matching the admin UI:
 * `internalName` when set, otherwise the external title.
 *
 * @param workflow - Workflow config summary
 * @returns Display title used in Preference Workflows dropdown
 */
export function getWorkflowConfigDisplayTitle(workflow: WorkflowConfigSummary): string {
  return workflow.internalName || workflow.title.defaultMessage;
}

/**
 * Fetch all workflow configs in the organization, optionally filtered by type.
 *
 * @param client - GraphQL client
 * @param options - Options
 * @returns Workflow configs
 */
export async function fetchAllWorkflowConfigs(
  client: GraphQLClient,
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Filter to a specific workflow config type (e.g. DSR) */
    workflowConfigType?: WorkflowConfigType;
  } = {},
): Promise<WorkflowConfigSummary[]> {
  const { logger, workflowConfigType } = options;
  const workflows: WorkflowConfigSummary[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      workflows: { nodes },
    } = await makeGraphQLRequest<{
      /** Workflows list */
      workflows: {
        /** Page of workflow configs */
        nodes: WorkflowConfigSummary[];
      };
    }>(client, WORKFLOWS, {
      variables: {
        first: PAGE_SIZE,
        offset,
        filterBy: workflowConfigType ? { workflowConfigType } : undefined,
      },
      logger,
    });
    workflows.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return workflows.sort((a, b) =>
    getWorkflowConfigDisplayTitle(a).localeCompare(getWorkflowConfigDisplayTitle(b)),
  );
}

/**
 * Resolve a YAML `workflow-title` to a DSR workflow config.
 * Matches against display title (`internalName` or external title).
 *
 * @param workflows - Candidate workflow configs
 * @param workflowTitle - Title from transcend.yml
 * @returns Matching workflow
 */
export function resolveWorkflowConfigByTitle(
  workflows: WorkflowConfigSummary[],
  workflowTitle: string,
): WorkflowConfigSummary {
  const matches = workflows.filter(
    (workflow) => getWorkflowConfigDisplayTitle(workflow) === workflowTitle,
  );
  if (matches.length === 0) {
    throw new Error(
      `Failed to find DSR workflow with title: ${workflowTitle}. ` +
        `Use the workflow internal name when set, otherwise the external title.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Found multiple DSR workflows with title: ${workflowTitle}. ` +
        `Set a unique internalName on the workflow in the Admin Dashboard.`,
    );
  }
  const [match] = matches;
  if (!match) {
    throw new Error(`Failed to find DSR workflow with title: ${workflowTitle}.`);
  }
  return match;
}

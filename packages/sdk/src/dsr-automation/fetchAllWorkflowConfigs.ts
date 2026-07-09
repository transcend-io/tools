import {
  CollectDataSubjectRegions,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  RequestAction,
  WorkflowConfigType,
  WorkflowConfigVisibility,
} from '@transcend-io/privacy-types';
import type { Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { WORKFLOW_CONFIGS } from './gqls/workflowConfig.js';

/** Raw workflow config node returned by GraphQL */
export interface WorkflowConfigNode {
  /** Workflow config ID */
  id: string;
  /** Title */
  title: {
    /** Default message */
    defaultMessage: string;
  };
  /** Subtitle */
  subtitle: {
    /** Default message */
    defaultMessage: string;
  } | null;
  /** Description */
  description: {
    /** Default message */
    defaultMessage: string;
  } | null;
  /** Internal name */
  internalName: string | null;
  /** Visibility tier */
  workflowConfigVisibility: WorkflowConfigVisibility;
  /** Workflow type (DSR or PREFERENCE_MANAGEMENT) */
  workflowConfigType: WorkflowConfigType;
  /** Whether the workflow collects the data subject's region */
  collectDataSubjectRegions: CollectDataSubjectRegions | null;
  /** Region allow list */
  regionList: (IsoCountryCode | IsoCountrySubdivisionCode)[];
  /** Per-region request expiry times */
  expiryTime:
    | {
        /** Region code (or 'default') */
        region: 'default' | IsoCountryCode | IsoCountrySubdivisionCode;
        /** Expiry time in days */
        value: number;
      }[]
    | null;
  /** Request action */
  action: {
    /** Action ID */
    id: string;
    /** Action type */
    type: RequestAction;
  };
  /** Data subject */
  subject: {
    /** Data subject ID */
    id: string;
    /** Data subject type */
    type: string;
  } | null;
  /** Attribute keys (custom fields) associated with the workflow */
  WorkflowConfigAttributeKeys:
    | {
        /** Attribute key */
        attributeKey: {
          /** Attribute key ID */
          id: string;
          /** Attribute key name */
          name: string;
        };
      }[]
    | null;
}

/** Alias used by consent-workflow-trigger helpers */
export type WorkflowConfigSummary = WorkflowConfigNode;

const PAGE_SIZE = 50;

/**
 * Display title for a workflow config, matching the admin UI:
 * `internalName` when set, otherwise the external title.
 *
 * @param workflow - Workflow config
 * @returns Display title used in Preference Workflows dropdown
 */
export function getWorkflowConfigDisplayTitle(workflow: WorkflowConfigNode): string {
  return workflow.internalName || workflow.title.defaultMessage;
}

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
    workflowConfigType?: WorkflowConfigType;
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<WorkflowConfigNode[]> {
  const { logger, workflowConfigType } = options;
  const configs: WorkflowConfigNode[] = [];
  let offset = 0;

  let shouldContinue = false;
  do {
    const {
      workflows: { nodes },
    } = await makeGraphQLRequest<{
      /** Workflows */
      workflows: {
        /** List */
        nodes: WorkflowConfigNode[];
      };
    }>(client, WORKFLOW_CONFIGS, {
      variables: {
        first: PAGE_SIZE,
        offset,
        filterBy: workflowConfigType ? { workflowConfigType } : undefined,
      },
      logger,
    });

    configs.push(...nodes);
    offset += PAGE_SIZE;
    shouldContinue = nodes.length === PAGE_SIZE;
  } while (shouldContinue);

  return configs.sort((a, b) =>
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
  workflows: WorkflowConfigNode[],
  workflowTitle: string,
): WorkflowConfigNode {
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

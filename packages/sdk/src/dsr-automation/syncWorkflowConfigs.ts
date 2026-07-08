import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllActions, type Action } from './fetchAllActions.js';
import { fetchAllWorkflowConfigs } from './fetchAllWorkflowConfigs.js';
import { fetchAllDataSubjects, type DataSubject } from './fetchDataSubjects.js';
import { UPDATE_WORKFLOW_CONFIG } from './gqls/workflowConfig.js';

export interface WorkflowConfigSyncInput {
  /** Workflow config ID (required — configs are created in the Admin Dashboard) */
  id: string;
  /** Title */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Description */
  description?: string;
  /** Internal name */
  'internal-name'?: string;
  /** Request action type */
  'action-type'?: string;
  /** Data subject type */
  'data-subject-type'?: string;
  /** Visibility tier (DRAFT, INTERNAL, PUBLISHED) */
  visibility?: string;
  /** Region allow list */
  'region-list'?: string[];
}

/**
 * Sync DSR workflow configs to Transcend
 *
 * @param client - GraphQL client
 * @param inputs - Workflow config inputs from YAML
 * @param options - Options
 * @returns True if run without error
 */
export async function syncWorkflowConfigs(
  client: GraphQLClient,
  inputs: WorkflowConfigSyncInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
  } = {},
): Promise<boolean> {
  const { logger } = options;
  logger?.info(`Syncing "${inputs.length}" workflow configs...`);

  let encounteredError = false;

  const needsActions = inputs.some((config) => config['action-type']);
  const needsSubjects = inputs.some((config) => config['data-subject-type']);

  const [existingConfigs, actions, dataSubjects] = await Promise.all([
    fetchAllWorkflowConfigs(client, { logger }),
    needsActions ? fetchAllActions(client, { logger }) : ([] as Action[]),
    needsSubjects ? fetchAllDataSubjects(client, { logger }) : ([] as DataSubject[]),
  ]);

  const configById = keyBy(existingConfigs, 'id');
  const actionByType = keyBy(actions, 'type') as Record<string, Action>;
  const dataSubjectByType = keyBy(dataSubjects, 'type') as Record<string, DataSubject>;

  await mapSeries(inputs, async (config) => {
    try {
      const existingConfig = configById[config.id];
      if (!existingConfig) {
        throw new Error(`Failed to find workflow config with id: ${config.id}`);
      }

      let subjectId: string | undefined;
      if (config['data-subject-type']) {
        const subject = dataSubjectByType[config['data-subject-type']];
        if (!subject) {
          throw new Error(`Failed to find data subject with type: ${config['data-subject-type']}`);
        }
        subjectId = subject.id;
      }

      if (config['action-type'] && !actionByType[config['action-type']]) {
        throw new Error(`Failed to find action with type: ${config['action-type']}`);
      }

      const mutationInput: Record<string, unknown> = {
        workflowConfigId: config.id,
        ...(config.title !== undefined ? { title: config.title } : {}),
        ...(config.subtitle !== undefined ? { subtitle: config.subtitle } : {}),
        ...(config.description !== undefined ? { description: config.description } : {}),
        ...(config['internal-name'] !== undefined ? { internalName: config['internal-name'] } : {}),
        ...(config.visibility !== undefined ? { workflowConfigVisibility: config.visibility } : {}),
        ...(config['action-type'] !== undefined ? { actionType: config['action-type'] } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(config['region-list'] !== undefined ? { regionList: config['region-list'] } : {}),
      };

      await makeGraphQLRequest(client, UPDATE_WORKFLOW_CONFIG, {
        variables: { input: mutationInput },
        logger,
      });

      logger?.info(`Successfully synced workflow config "${existingConfig.title}" (${config.id})!`);
    } catch (err) {
      encounteredError = true;
      logger?.error(`Failed to sync workflow config "${config.id}"! - ${(err as Error).message}`);
    }
  });

  logger?.info(`Synced "${inputs.length}" workflow configs!`);
  return !encounteredError;
}

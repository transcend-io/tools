import {
  CollectDataSubjectRegions,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  RequestAction,
  WorkflowConfigVisibility,
} from '@transcend-io/privacy-types';
import { indexBy } from '@transcend-io/type-utils';
import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { groupBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllActions, type Action } from './fetchAllActions.js';
import { fetchAllRequestAttributeKeys, type AttributeKey } from './fetchAllAttributeKeys.js';
import { fetchAllWorkflowConfigs } from './fetchAllWorkflowConfigs.js';
import { fetchAllDataSubjects, type DataSubject } from './fetchDataSubjects.js';
import { UPDATE_WORKFLOW_CONFIG } from './gqls/workflowConfig.js';

export interface WorkflowConfigSyncInput {
  /**
   * Title of the workflow config. This is the unique, human-readable key used
   * to match an existing workflow config (configs are created in the Admin
   * Dashboard, so this sync is update-only).
   */
  title: string;
  /** Subtitle */
  subtitle?: string;
  /** Description */
  description?: string;
  /** Internal name */
  'internal-name'?: string;
  /** Request action type */
  'action-type'?: RequestAction;
  /** Data subject type */
  'data-subject-type'?: string;
  /** Visibility tier (DRAFT, INTERNAL, PUBLISHED) */
  visibility?: WorkflowConfigVisibility;
  /** Whether to collect the data subject's region (COLLECT, DO_NOT_COLLECT) */
  'collect-data-subject-regions'?: CollectDataSubjectRegions;
  /** Region allow list */
  'region-list'?: (IsoCountryCode | IsoCountrySubdivisionCode)[];
  /** Per-region request expiry times */
  'expiry-time'?: {
    /** Region code (or 'default') */
    region: 'default' | IsoCountryCode | IsoCountrySubdivisionCode;
    /** Expiry time in days */
    value: number;
  }[];
  /** Attribute key (custom field) names to associate with the workflow */
  'attribute-keys'?: string[];
}

/**
 * Sync DSR workflow configs to Transcend.
 *
 * Workflow configs are created in the Admin Dashboard, so this is update-only:
 * each input is matched to an existing config by its (unique) title.
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
  const needsAttributeKeys = inputs.some((config) => config['attribute-keys']?.length);

  const [existingConfigs, actions, dataSubjects, attributeKeys] = await Promise.all([
    fetchAllWorkflowConfigs(client, { logger }),
    needsActions ? fetchAllActions(client, { logger }) : ([] as Action[]),
    needsSubjects ? fetchAllDataSubjects(client, { logger }) : ([] as DataSubject[]),
    needsAttributeKeys ? fetchAllRequestAttributeKeys(client, { logger }) : ([] as AttributeKey[]),
  ]);

  const configsByTitle = groupBy(existingConfigs, (config) => config.title.defaultMessage);
  const actionByType = indexBy(actions, (action) => action.type);
  const dataSubjectByType = indexBy(dataSubjects, (subject) => subject.type);
  const attributeKeyByName = indexBy(attributeKeys, (attributeKey) => attributeKey.name);

  await mapSeries(inputs, async (config) => {
    try {
      const matches = configsByTitle[config.title] ?? [];
      const [existingConfig, ...duplicates] = matches;
      if (!existingConfig) {
        throw new Error(
          `Failed to find workflow config with title: "${config.title}". ` +
            'Workflow configs must be created in the Admin Dashboard before they can be synced.',
        );
      }
      if (duplicates.length > 0) {
        throw new Error(
          `Found "${matches.length}" workflow configs with title: "${config.title}". ` +
            'Titles must be unique to sync workflow configs.',
        );
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

      let attributeKeyIds: string[] | undefined;
      if (config['attribute-keys'] !== undefined) {
        attributeKeyIds = config['attribute-keys'].map((name) => {
          const attributeKey = attributeKeyByName[name];
          if (!attributeKey) {
            throw new Error(`Failed to find attribute key with name: ${name}`);
          }
          return attributeKey.id;
        });
      }

      const mutationInput: Record<string, unknown> = {
        workflowConfigId: existingConfig.id,
        ...(config.subtitle !== undefined ? { subtitle: config.subtitle } : {}),
        ...(config.description !== undefined ? { description: config.description } : {}),
        ...(config['internal-name'] !== undefined ? { internalName: config['internal-name'] } : {}),
        ...(config.visibility !== undefined ? { workflowConfigVisibility: config.visibility } : {}),
        ...(config['action-type'] !== undefined ? { actionType: config['action-type'] } : {}),
        ...(config['collect-data-subject-regions'] !== undefined
          ? { collectDataSubjectRegions: config['collect-data-subject-regions'] }
          : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(config['region-list'] !== undefined ? { regionList: config['region-list'] } : {}),
        ...(config['expiry-time'] !== undefined ? { expiryTime: config['expiry-time'] } : {}),
        ...(attributeKeyIds !== undefined ? { attributeKeyIds } : {}),
      };

      await makeGraphQLRequest(client, UPDATE_WORKFLOW_CONFIG, {
        variables: { input: mutationInput },
        logger,
      });

      logger?.info(
        `Successfully synced workflow config "${config.title}" (${existingConfig.id})!`,
      );
    } catch (err) {
      encounteredError = true;
      logger?.error(
        `Failed to sync workflow config "${config.title}"! - ${(err as Error).message}`,
      );
    }
  });

  logger?.info(`Synced "${inputs.length}" workflow configs!`);
  return !encounteredError;
}

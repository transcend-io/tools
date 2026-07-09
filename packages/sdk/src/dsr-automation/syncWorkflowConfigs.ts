import {
  CollectDataSubjectRegions,
  IsoCountryCode,
  IsoCountrySubdivisionCode,
  RequestAction,
  WorkflowConfigType,
  WorkflowConfigVisibility,
} from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { groupBy, keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllActions } from './fetchAllActions.js';
import { fetchAllRequestAttributeKeys, type AttributeKey } from './fetchAllAttributeKeys.js';
import { fetchAllWorkflowConfigs } from './fetchAllWorkflowConfigs.js';
import { fetchAllDataSubjects, type DataSubject } from './fetchDataSubjects.js';
import { CREATE_WORKFLOW, UPDATE_WORKFLOW_CONFIG } from './gqls/workflowConfig.js';

export interface WorkflowConfigSyncInput {
  /**
   * Internal name of the workflow config. This is the stable key used to match
   * an existing workflow config on push (or to set on create when missing).
   */
  'internal-name': string;
  /** Request action type */
  'action-type': RequestAction;
  /** User-facing title (required for create; falls back to internal-name when omitted) */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Description */
  description?: string;
  /** Data subject type */
  'data-subject-type'?: string;
  /** Visibility tier (DRAFT, INTERNAL, PUBLISHED) */
  visibility?: WorkflowConfigVisibility;
  /**
   * Workflow config type. Only DSR is supported for sync; preference-management
   * workflows must be managed in the Admin Dashboard.
   */
  type?: WorkflowConfigType;
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
 * Sync workflow configs to Transcend.
 *
 * Matches each input to an existing config by `internal-name`. Missing configs
 * are created via `createWorkflow` (DSR only; starts as Draft with default
 * associations), then updated with the remaining YAML fields.
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

  const needsSubjects = inputs.some((config) => config['data-subject-type']);
  const needsAttributeKeys = inputs.some((config) => config['attribute-keys']?.length);

  const [existingConfigs, actions] = await Promise.all([
    fetchAllWorkflowConfigs(client, {
      logger,
      workflowConfigType: WorkflowConfigType.DSR,
    }),
    fetchAllActions(client, { logger }),
  ]);

  let dataSubjects: DataSubject[] = [];
  if (needsSubjects) {
    dataSubjects = await fetchAllDataSubjects(client, { logger });
  }

  let attributeKeys: AttributeKey[] = [];
  if (needsAttributeKeys) {
    attributeKeys = await fetchAllRequestAttributeKeys(client, { logger });
  }

  const configsByInternalName = groupBy(existingConfigs, (config) => config.internalName);
  const actionByType = keyBy(actions, 'type');
  const dataSubjectByType = keyBy(dataSubjects, 'type');
  const attributeKeyByName = keyBy(attributeKeys, 'name');

  await mapSeries(inputs, async (config) => {
    const internalName = config['internal-name'];
    try {
      if (config.type && config.type !== WorkflowConfigType.DSR) {
        throw new Error(
          `Workflow config with internal name: "${internalName}" has type ` +
            `"${config.type}". Only DSR workflow configs can be synced — ` +
            'preference management workflows have purpose-based semantics and must be managed in the Admin Dashboard.',
        );
      }

      const matches = configsByInternalName[internalName] ?? [];
      const [existingConfig, ...duplicates] = matches;

      // TODO: https://linear.app/transcend/issue/WAL-10312/enforce-unique-workflowconfiginternalname-in-the-database
      // Once DB uniqueness is enforced, this runtime duplicate check can be removed.
      if (duplicates.length > 0) {
        throw new Error(
          `Found "${matches.length}" workflow configs with internal name: "${internalName}". ` +
            'Internal names must be unique to sync workflow configs.',
        );
      }
      if (existingConfig && existingConfig.workflowConfigType !== WorkflowConfigType.DSR) {
        throw new Error(
          `Workflow config with internal name: "${internalName}" has type ` +
            `"${existingConfig.workflowConfigType}". Only DSR workflow configs can be synced — ` +
            'preference management workflows have purpose-based semantics and must be managed in the Admin Dashboard.',
        );
      }

      const expiryTime = config['expiry-time'];
      if (expiryTime && expiryTime.length > 0) {
        // The backend validates expiryTime against RegionExpiryMap, which requires
        // a `default` entry and all values > 0 — fail fast with a clearer error
        if (!expiryTime.some(({ region }) => region === 'default')) {
          throw new Error(
            `Workflow config with internal name: "${internalName}" has an expiry-time list ` +
              'without a "default" region entry. A `region: default` entry is required.',
          );
        }
        const invalidEntries = expiryTime.filter(({ value }) => value <= 0);
        if (invalidEntries.length > 0) {
          throw new Error(
            `Workflow config with internal name: "${internalName}" has expiry-time values that are ` +
              `not positive: ${invalidEntries
                .map(({ region, value }) => `${region}=${value}`)
                .join(', ')}. All expiry times must be greater than 0 days.`,
          );
        }
      }

      let subjectId: string | undefined;
      if (config['data-subject-type']) {
        const subject = dataSubjectByType[config['data-subject-type']];
        if (!subject) {
          throw new Error(`Failed to find data subject with type: ${config['data-subject-type']}`);
        }
        subjectId = subject.id;
      }

      if (!actionByType[config['action-type']]) {
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

      let workflowConfigId: string;
      if (!existingConfig) {
        // createWorkflow only accepts title/actionType/internalName (+ type).
        // Remaining fields are applied via updateWorkflowConfig below.
        // New workflows start as Draft with default associations (data silos, receipt email).
        const title = config.title ?? internalName;
        const {
          createWorkflow: { workflowConfig: created },
        } = await makeGraphQLRequest<{
          /** createWorkflow mutation */
          createWorkflow: {
            /** Created workflow config */
            workflowConfig: {
              /** ID */
              id: string;
              /** Internal name */
              internalName: string | null;
            };
          };
        }>(client, CREATE_WORKFLOW, {
          variables: {
            input: {
              title,
              actionType: config['action-type'],
              internalName,
              workflowConfigType: WorkflowConfigType.DSR,
            },
          },
          logger,
        });
        workflowConfigId = created.id;
        // Track the new config so a later YAML entry with the same internal-name
        // updates instead of attempting a second create in this sync run.
        configsByInternalName[internalName] = [
          {
            id: created.id,
            title: { defaultMessage: title },
            subtitle: null,
            description: null,
            internalName: created.internalName ?? internalName,
            workflowConfigVisibility: WorkflowConfigVisibility.Draft,
            workflowConfigType: WorkflowConfigType.DSR,
            collectDataSubjectRegions: null,
            regionList: [],
            expiryTime: null,
            action: { type: config['action-type'] },
            subject: null,
            WorkflowConfigAttributeKeys: null,
          },
        ];
        logger?.info(`Successfully created workflow config "${internalName}" (${created.id})!`);
      } else {
        workflowConfigId = existingConfig.id;
      }

      const mutationInput: Record<string, unknown> = {
        workflowConfigId,
        ...(config.title !== undefined ? { title: config.title } : {}),
        ...(config.subtitle !== undefined ? { subtitle: config.subtitle } : {}),
        ...(config.description !== undefined ? { description: config.description } : {}),
        ...(config.visibility !== undefined ? { workflowConfigVisibility: config.visibility } : {}),
        actionType: config['action-type'],
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

      logger?.info(`Successfully synced workflow config "${internalName}" (${workflowConfigId})!`);
    } catch (err) {
      encounteredError = true;
      logger?.error(
        `Failed to sync workflow config "${internalName}"! - ${(err as Error).message}`,
      );
    }
  });

  logger?.info(`Synced "${inputs.length}" workflow configs!`);
  return !encounteredError;
}

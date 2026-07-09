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
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllActions } from './fetchAllActions.js';
import { fetchAllRequestAttributeKeys, type AttributeKey } from './fetchAllAttributeKeys.js';
import { fetchAllWorkflowConfigs, type WorkflowConfigNode } from './fetchAllWorkflowConfigs.js';
import { fetchAllDataSubjects, type DataSubject } from './fetchDataSubjects.js';
import { CREATE_WORKFLOW, UPDATE_WORKFLOW_CONFIG } from './gqls/workflowConfig.js';
import {
  resolveWorkflowConfigMatch,
  workflowConfigInputLabel,
} from './resolveWorkflowConfigMatch.js';

export interface WorkflowConfigSyncInput {
  /** User-facing title */
  title: string;
  /** Request action type */
  'action-type': RequestAction;
  /**
   * Internal name of the workflow config. When provided, used as the first match
   * key; when omitted, matching falls back through title, action, subject, and
   * regions.
   */
  'internal-name'?: string;
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
 * Matches each input using a cascading key: internal-name → title → action-type
 * → data-subject-type (when provided) → region-list. Missing configs are
 * created via `createWorkflow` (DSR only; starts as Draft with default
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

  const [fetchedConfigs, actions] = await Promise.all([
    fetchAllWorkflowConfigs(client, {
      logger,
      workflowConfigType: WorkflowConfigType.DSR,
    }),
    fetchAllActions(client, { logger }),
  ]);

  const existingConfigs: WorkflowConfigNode[] = [...fetchedConfigs];

  let dataSubjects: DataSubject[] = [];
  if (needsSubjects) {
    dataSubjects = await fetchAllDataSubjects(client, { logger });
  }

  let attributeKeys: AttributeKey[] = [];
  if (needsAttributeKeys) {
    attributeKeys = await fetchAllRequestAttributeKeys(client, { logger });
  }

  const actionByType = keyBy(actions, 'type');
  const dataSubjectByType = keyBy(dataSubjects, 'type');
  const attributeKeyByName = keyBy(attributeKeys, 'name');

  await mapSeries(inputs, async (config) => {
    const label = workflowConfigInputLabel(config);
    try {
      if (config.type && config.type !== WorkflowConfigType.DSR) {
        throw new Error(
          `Workflow config "${label}" has type ` +
            `"${config.type}". Only DSR workflow configs can be synced — ` +
            'preference management workflows have purpose-based semantics and must be managed in the Admin Dashboard.',
        );
      }

      const resolution = resolveWorkflowConfigMatch(config, existingConfigs);
      if (resolution.kind === 'ambiguous') {
        throw new Error(
          `Found "${resolution.candidates.length}" workflow configs matching ` +
            `"${label}" after applying title, action-type, data-subject-type, and region-list. ` +
            'Add a unique internal-name or disambiguating region-list to sync this workflow.',
        );
      }

      const existingConfig = resolution.kind === 'match' ? resolution.config : undefined;

      if (existingConfig && existingConfig.workflowConfigType !== WorkflowConfigType.DSR) {
        throw new Error(
          `Workflow config "${label}" has type ` +
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
            `Workflow config "${label}" has an expiry-time list ` +
              'without a "default" region entry. A `region: default` entry is required.',
          );
        }
        const invalidEntries = expiryTime.filter(({ value }) => value <= 0);
        if (invalidEntries.length > 0) {
          throw new Error(
            `Workflow config "${label}" has expiry-time values that are ` +
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
        const internalName = config['internal-name'];
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
              title: config.title,
              actionType: config['action-type'],
              ...(internalName ? { internalName } : {}),
              workflowConfigType: WorkflowConfigType.DSR,
            },
          },
          logger,
        });
        workflowConfigId = created.id;
        // Track the new config so a later YAML entry with the same match key
        // updates instead of attempting a second create in this sync run.
        existingConfigs.push({
          id: created.id,
          title: { defaultMessage: config.title },
          subtitle: null,
          description: null,
          internalName: created.internalName ?? internalName ?? null,
          workflowConfigVisibility: WorkflowConfigVisibility.Draft,
          workflowConfigType: WorkflowConfigType.DSR,
          collectDataSubjectRegions: null,
          regionList: config['region-list'] ?? [],
          expiryTime: null,
          action: { type: config['action-type'] },
          subject: subjectId
            ? { id: subjectId, type: config['data-subject-type'] as string }
            : null,
          WorkflowConfigAttributeKeys: null,
        });
        logger?.info(`Successfully created workflow config "${label}" (${created.id})!`);
      } else {
        workflowConfigId = existingConfig.id;
      }

      const mutationInput: Record<string, unknown> = {
        workflowConfigId,
        ...(config.title !== undefined ? { title: config.title } : {}),
        ...(config.subtitle !== undefined ? { subtitle: config.subtitle } : {}),
        ...(config.description !== undefined ? { description: config.description } : {}),
        ...(config.visibility !== undefined ? { workflowConfigVisibility: config.visibility } : {}),
        ...(config['internal-name'] !== undefined ? { internalName: config['internal-name'] } : {}),
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

      logger?.info(`Successfully synced workflow config "${label}" (${workflowConfigId})!`);
    } catch (err) {
      encounteredError = true;
      logger?.error(`Failed to sync workflow config "${label}"! - ${(err as Error).message}`);
    }
  });

  logger?.info(`Synced "${inputs.length}" workflow configs!`);
  return !encounteredError;
}

import { RequestAction, WorkflowConfigType } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllDataSilos } from '../data-inventory/fetchAllDataSilos.js';
import { fetchAllActions, type Action } from '../dsr-automation/fetchAllActions.js';
import {
  fetchAllWorkflowConfigs,
  getWorkflowConfigDisplayTitle,
  resolveWorkflowConfigByTitle,
  type WorkflowConfigSummary,
} from '../dsr-automation/fetchAllWorkflowConfigs.js';
import { fetchAllDataSubjects, type DataSubject } from '../dsr-automation/fetchDataSubjects.js';
import { fetchAllPurposes, type Purpose } from '../preference-management/fetchAllPurposes.js';
import { fetchAllConsentWorkflowTriggers } from './fetchAllConsentWorkflowTriggers.js';
import { CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER } from './gqls/consentWorkflowTrigger.js';

export interface ConsentWorkflowTriggerPurposeInput {
  /** The tracking type slug of the purpose */
  'tracking-type': string;
  /** The matching consent state for the purpose */
  'matching-state': boolean;
}

export interface ConsentWorkflowTriggerSyncInput {
  /** The name of the consent workflow trigger */
  name: string;
  /**
   * Purposes and their matching consent states.
   * Required (non-empty). Used to derive triggerCondition.
   */
  purposes: ConsentWorkflowTriggerPurposeInput[];
  /**
   * DSR workflow display title (internalName or external title).
   * V2 mode — mutually exclusive with action-type / data-silo-titles.
   */
  'workflow-title'?: string;
  /** The action type (e.g. ERASURE, ACCESS). Legacy mode; required on create when no workflow-title. */
  'action-type'?: RequestAction;
  /** The data subject type. Required on create (legacy) or always when set. */
  'data-subject-type'?: string;
  /** Whether the trigger runs silently */
  'is-silent'?: boolean;
  /** Whether unauthenticated requests are allowed */
  'allow-unauthenticated'?: boolean;
  /** Whether the trigger is active */
  'is-active'?: boolean;
  /** Titles of data silos associated with this trigger (legacy mode only) */
  'data-silo-titles'?: string[];
}

/**
 * Build the GraphQL triggerCondition JSON string from purposes,
 * matching the admin dashboard Preferences → Consent Workflows UI.
 *
 * @param purposes - Purpose tracking types and matching states
 * @returns JSON string of `{ And: [{ [trackingType]: matchingState }, ...] }`
 */
export function buildTriggerConditionFromPurposes(
  purposes: ConsentWorkflowTriggerPurposeInput[],
): string {
  return JSON.stringify({
    And: purposes.map((purpose) => ({
      [purpose['tracking-type']]: purpose['matching-state'],
    })),
  });
}

/**
 * Parse GraphQL triggerCondition JSON into purposes for transcend.yml.
 * Expects ConditionalExpression shape: `{ And: [{ [trackingType]: boolean }, ...] }`.
 *
 * @param triggerCondition - JSON string from GraphQL (or null)
 * @returns Purpose entries for YAML, or empty if unparseable
 */
export function parsePurposesFromTriggerCondition(
  triggerCondition: string | null | undefined,
): ConsentWorkflowTriggerPurposeInput[] {
  if (!triggerCondition) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(triggerCondition);
    if (!parsed || typeof parsed !== 'object') {
      return [];
    }

    const andEntries = (parsed as { And?: unknown }).And;
    if (!Array.isArray(andEntries)) {
      return [];
    }

    const purposes: ConsentWorkflowTriggerPurposeInput[] = [];
    for (const entry of andEntries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        continue;
      }
      for (const [trackingType, matchingState] of Object.entries(
        entry as Record<string, unknown>,
      )) {
        if (typeof matchingState === 'boolean') {
          purposes.push({
            'tracking-type': trackingType,
            'matching-state': matchingState,
          });
        }
      }
    }
    return purposes;
  } catch {
    return [];
  }
}

/**
 * Whether this YAML entry is Workflows V2 mode (links a DSR workflow config).
 *
 * @param trigger - Sync input
 * @returns True when workflow-title is set
 */
export function isConsentWorkflowTriggerV2Mode(
  trigger: Pick<ConsentWorkflowTriggerSyncInput, 'workflow-title'>,
): boolean {
  return Boolean(trigger['workflow-title']);
}

/**
 * Validate mutual exclusivity and required fields for a trigger input.
 * Pure helper for unit tests and sync.
 *
 * @param trigger - Sync input
 * @param options - Whether the trigger already exists in the org
 */
export function validateConsentWorkflowTriggerMode(
  trigger: ConsentWorkflowTriggerSyncInput,
  options: {
    /** True when updating an existing trigger by name */
    isUpdate: boolean;
  },
): void {
  if (!trigger.purposes?.length) {
    throw new Error(
      `Consent workflow trigger "${trigger.name}" requires a non-empty "purposes" list ` +
        `(each entry needs tracking-type and matching-state). ` +
        `See Preferences → Preference Workflows.`,
    );
  }

  const isV2 = isConsentWorkflowTriggerV2Mode(trigger);
  const hasLegacyAction = Boolean(trigger['action-type']);
  const hasLegacySilos = Boolean(trigger['data-silo-titles']?.length);

  if (isV2 && (hasLegacyAction || hasLegacySilos)) {
    throw new Error(
      `Consent workflow trigger "${trigger.name}" cannot set "workflow-title" together with ` +
        `"action-type" or "data-silo-titles". Use workflow-title for Workflows V2, ` +
        `or action-type / data-silo-titles for legacy mode.`,
    );
  }

  if (!options.isUpdate) {
    if (isV2) {
      // workflow-title already present; data-subject-type may come from the workflow
      return;
    }
    if (!trigger['action-type']) {
      throw new Error(
        `Consent workflow trigger "${trigger.name}" requires "action-type" when creating ` +
          `a legacy trigger (or set "workflow-title" for Workflows V2).`,
      );
    }
    if (!trigger['data-subject-type']) {
      throw new Error(
        `Consent workflow trigger "${trigger.name}" requires "data-subject-type" when creating a new trigger.`,
      );
    }
  }
}

/**
 * Resolve workflow display title from a workflowConfigId.
 *
 * @param workflows - DSR workflows
 * @param workflowConfigId - Linked workflow config ID
 * @returns Display title, or undefined if not found
 */
export function resolveWorkflowTitleFromId(
  workflows: WorkflowConfigSummary[],
  workflowConfigId: string | null | undefined,
): string | undefined {
  if (!workflowConfigId) {
    return undefined;
  }
  const workflow = workflows.find((candidate) => candidate.id === workflowConfigId);
  return workflow ? getWorkflowConfigDisplayTitle(workflow) : undefined;
}

/**
 * Sync consent workflow triggers to Transcend
 *
 * @param client - GraphQL client
 * @param inputs - Consent workflow trigger inputs from YAML
 * @param options - Options
 * @returns True if run without error
 */
export async function syncConsentWorkflowTriggers(
  client: GraphQLClient,
  inputs: ConsentWorkflowTriggerSyncInput[],
  options: {
    /** Logger instance */
    logger?: Logger;
    /** Page size when fetching data silos */
    pageSize?: number;
  } = {},
): Promise<boolean> {
  const { logger, pageSize = 50 } = options;
  logger?.info(`Syncing "${inputs.length}" consent workflow triggers...`);

  let encounteredError = false;

  const needsV2 = inputs.some((t) => isConsentWorkflowTriggerV2Mode(t));
  const needsActions = inputs.some((t) => t['action-type']);
  const needsSubjects = inputs.some((t) => t['data-subject-type']);
  const needsDataSilos = inputs.some((t) => t['data-silo-titles']?.length);

  const [existingTriggers, actions, dataSubjects, purposes, dataSilos, dsrWorkflows] =
    await Promise.all([
      fetchAllConsentWorkflowTriggers(client, { logger }),
      needsActions ? fetchAllActions(client, { logger }) : ([] as Action[]),
      needsSubjects ? fetchAllDataSubjects(client, { logger }) : ([] as DataSubject[]),
      // Purposes are always required to resolve purposeId for the mutation
      fetchAllPurposes(client, { logger }),
      needsDataSilos ? fetchAllDataSilos(client, { pageSize, logger }) : [],
      needsV2
        ? fetchAllWorkflowConfigs(client, {
            logger,
            workflowConfigType: WorkflowConfigType.DSR,
          })
        : ([] as WorkflowConfigSummary[]),
    ]);

  const triggerByName = keyBy(existingTriggers, 'name');
  const actionByType = keyBy(actions, 'type') as Record<string, Action>;
  const dataSubjectByType = keyBy(dataSubjects, 'type') as Record<string, DataSubject>;
  const purposeByTrackingType = keyBy(purposes, 'trackingType') as Record<string, Purpose>;
  const dataSiloByTitle = keyBy(dataSilos, 'title') as Record<
    string,
    { id: string; title: string }
  >;

  await mapSeries(inputs, async (trigger) => {
    try {
      const existingTrigger = triggerByName[trigger.name];
      validateConsentWorkflowTriggerMode(trigger, { isUpdate: Boolean(existingTrigger) });

      const consentWorkflowTriggerPurposes = trigger.purposes.map((purposeInput) => {
        const purpose = purposeByTrackingType[purposeInput['tracking-type']];
        if (!purpose) {
          throw new Error(
            `Failed to find purpose with trackingType: ${purposeInput['tracking-type']}`,
          );
        }
        return {
          purposeId: purpose.id,
          matchingState: purposeInput['matching-state'],
        };
      });

      const mutationInput: Record<string, unknown> = {
        name: trigger.name,
        ...(existingTrigger ? { id: existingTrigger.id } : {}),
        triggerCondition: buildTriggerConditionFromPurposes(trigger.purposes),
        consentWorkflowTriggerPurposes,
        ...(trigger['is-silent'] !== undefined ? { isSilent: trigger['is-silent'] } : {}),
        ...(trigger['allow-unauthenticated'] !== undefined
          ? { allowUnauthenticated: trigger['allow-unauthenticated'] }
          : {}),
        ...(trigger['is-active'] !== undefined ? { isActive: trigger['is-active'] } : {}),
      };

      if (isConsentWorkflowTriggerV2Mode(trigger)) {
        const workflow = resolveWorkflowConfigByTitle(dsrWorkflows, trigger['workflow-title']!);
        mutationInput.workflowConfigId = workflow.id;

        // Backend create still requires actionId + dataSubjectId — take from the workflow
        if (!existingTrigger) {
          mutationInput.actionId = workflow.action.id;
          if (!workflow.subject) {
            throw new Error(
              `DSR workflow "${trigger['workflow-title']}" has no data subject; ` +
                `cannot create consent workflow trigger "${trigger.name}".`,
            );
          }
          mutationInput.dataSubjectId = workflow.subject.id;
        } else if (trigger['data-subject-type']) {
          // Allow updating data-subject-type explicitly on V2 updates if provided
          const subject = dataSubjectByType[trigger['data-subject-type']];
          if (!subject) {
            // May need to fetch subjects if only V2 creates were expected — fetch on demand via workflow
            throw new Error(
              `Failed to find data subject with type: ${trigger['data-subject-type']}`,
            );
          }
          mutationInput.dataSubjectId = subject.id;
        }
      } else {
        // Legacy mode
        let actionId: string | undefined;
        if (trigger['action-type']) {
          const action = actionByType[trigger['action-type']];
          if (!action) {
            throw new Error(`Failed to find action with type: ${trigger['action-type']}`);
          }
          actionId = action.id;
        }

        let dataSubjectId: string | undefined;
        if (trigger['data-subject-type']) {
          const subject = dataSubjectByType[trigger['data-subject-type']];
          if (!subject) {
            throw new Error(
              `Failed to find data subject with type: ${trigger['data-subject-type']}`,
            );
          }
          dataSubjectId = subject.id;
        }

        let dataSiloIds: string[] | undefined;
        if (trigger['data-silo-titles']?.length) {
          dataSiloIds = trigger['data-silo-titles'].map((title) => {
            const dataSilo = dataSiloByTitle[title];
            if (!dataSilo) {
              throw new Error(`Failed to find data silo with title: ${title}`);
            }
            return dataSilo.id;
          });
        }

        if (actionId) {
          mutationInput.actionId = actionId;
        }
        if (dataSubjectId) {
          mutationInput.dataSubjectId = dataSubjectId;
        }
        if (dataSiloIds) {
          mutationInput.dataSiloIds = dataSiloIds;
        }
      }

      await makeGraphQLRequest<{
        /** Mutation result */
        createOrUpdateConsentWorkflowTrigger: {
          /** Created or updated trigger */
          consentWorkflowTrigger: {
            /** Trigger ID */
            id: string;
          };
        };
      }>(client, CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER, {
        variables: { input: mutationInput },
        logger,
      });

      logger?.info(`Successfully synced consent workflow trigger "${trigger.name}"!`);
    } catch (err) {
      encounteredError = true;
      logger?.error(
        `Failed to sync consent workflow trigger "${trigger.name}"! - ${(err as Error).message}`,
      );
    }
  });

  logger?.info(`Synced "${inputs.length}" consent workflow triggers!`);
  return !encounteredError;
}

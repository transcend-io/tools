import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest } from '../api/makeGraphQLRequest.js';
import { fetchAllDataSilos } from '../data-inventory/fetchAllDataSilos.js';
import { fetchAllActions, type Action } from '../dsr-automation/fetchAllActions.js';
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
  /** The trigger condition as a JSON string */
  'trigger-condition'?: string;
  /** The action type (e.g. ERASURE, ACCESS) */
  'action-type'?: string;
  /** The data subject type */
  'data-subject-type'?: string;
  /** Whether the trigger runs silently */
  'is-silent'?: boolean;
  /** Whether unauthenticated requests are allowed */
  'allow-unauthenticated'?: boolean;
  /** Whether the trigger is active */
  'is-active'?: boolean;
  /** Titles of data silos associated with this trigger */
  'data-silo-titles'?: string[];
  /** Purposes and their matching consent states */
  purposes?: ConsentWorkflowTriggerPurposeInput[];
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

  const needsActions = inputs.some((t) => t['action-type']);
  const needsSubjects = inputs.some((t) => t['data-subject-type']);
  const needsPurposes = inputs.some((t) => t.purposes?.length);
  const needsDataSilos = inputs.some((t) => t['data-silo-titles']?.length);

  const [existingTriggers, actions, dataSubjects, purposes, dataSilos] = await Promise.all([
    fetchAllConsentWorkflowTriggers(client, { logger }),
    needsActions ? fetchAllActions(client, { logger }) : ([] as Action[]),
    needsSubjects ? fetchAllDataSubjects(client, { logger }) : ([] as DataSubject[]),
    needsPurposes ? fetchAllPurposes(client, { logger }) : ([] as Purpose[]),
    needsDataSilos ? fetchAllDataSilos(client, { pageSize, logger }) : [],
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
          throw new Error(`Failed to find data subject with type: ${trigger['data-subject-type']}`);
        }
        dataSubjectId = subject.id;
      }

      const consentWorkflowTriggerPurposes = trigger.purposes?.map((purposeInput) => {
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

      const mutationInput: Record<string, unknown> = {
        name: trigger.name,
        ...(existingTrigger ? { id: existingTrigger.id } : {}),
        triggerCondition: trigger['trigger-condition'] ?? '{}',
        ...(actionId ? { actionId } : {}),
        ...(dataSubjectId ? { dataSubjectId } : {}),
        ...(dataSiloIds ? { dataSiloIds } : {}),
        ...(trigger['is-silent'] !== undefined ? { isSilent: trigger['is-silent'] } : {}),
        ...(trigger['allow-unauthenticated'] !== undefined
          ? { allowUnauthenticated: trigger['allow-unauthenticated'] }
          : {}),
        ...(trigger['is-active'] !== undefined ? { isActive: trigger['is-active'] } : {}),
        ...(existingTrigger && consentWorkflowTriggerPurposes
          ? { consentWorkflowTriggerPurposes }
          : {}),
      };

      const {
        createOrUpdateConsentWorkflowTrigger: {
          consentWorkflowTrigger: { id: triggerId },
        },
      } = await makeGraphQLRequest<{
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

      if (!existingTrigger && consentWorkflowTriggerPurposes?.length) {
        await makeGraphQLRequest(client, CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER, {
          variables: {
            input: {
              id: triggerId,
              consentWorkflowTriggerPurposes,
            },
          },
          logger,
        });
      }

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

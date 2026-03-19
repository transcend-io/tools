import colors from 'colors';
import { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { ConsentWorkflowTriggerInput } from '../../codecs.js';
import { logger } from '../../logger.js';
import { mapSeries } from '../bluebird.js';
import { fetchAllActions, type Action } from './fetchAllActions.js';
import { fetchAllConsentWorkflowTriggers } from './fetchAllConsentWorkflowTriggers.js';
import { fetchAllPurposes, type Purpose } from './fetchAllPurposes.js';
import { fetchAllDataSubjects, type DataSubject } from './fetchDataSubjects.js';
import { CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER } from './gqls/index.js';
import { makeGraphQLRequest } from './makeGraphQLRequest.js';

/**
 * Sync consent workflow triggers to Transcend
 *
 * @param client - GraphQL client
 * @param inputs - Consent workflow trigger inputs from YAML
 * @returns True if run without error, returns false if an error occurred
 */
export async function syncConsentWorkflowTriggers(
  client: GraphQLClient,
  inputs: ConsentWorkflowTriggerInput[],
): Promise<boolean> {
  logger.info(colors.magenta(`Syncing "${inputs.length}" consent workflow triggers...`));

  let encounteredError = false;

  const needsActions = inputs.some((t) => t['action-type']);
  const needsSubjects = inputs.some((t) => t['data-subject-type']);
  const needsPurposes = inputs.some((t) => t.purposes?.length);

  const [existingTriggers, actions, dataSubjects, purposes] = await Promise.all([
    fetchAllConsentWorkflowTriggers(client),
    needsActions ? fetchAllActions(client) : ([] as Action[]),
    needsSubjects ? fetchAllDataSubjects(client) : ([] as DataSubject[]),
    needsPurposes ? fetchAllPurposes(client) : ([] as Purpose[]),
  ]);

  const triggerByName = keyBy(existingTriggers, 'name');
  const actionByType = keyBy(actions, 'type') as Record<string, Action>;
  const dataSubjectByType = keyBy(dataSubjects, 'type') as Record<string, DataSubject>;
  const purposeByTrackingType = keyBy(purposes, 'trackingType') as Record<string, Purpose>;

  await mapSeries(inputs, async (trigger) => {
    try {
      const existingTrigger = triggerByName[trigger.name];

      // Resolve action type to ID
      let actionId: string | undefined;
      if (trigger['action-type']) {
        const action = actionByType[trigger['action-type']];
        if (!action) {
          throw new Error(`Failed to find action with type: ${trigger['action-type']}`);
        }
        actionId = action.id;
      }

      // Resolve data subject type to ID
      let dataSubjectId: string | undefined;
      if (trigger['data-subject-type']) {
        const subject = dataSubjectByType[trigger['data-subject-type']];
        if (!subject) {
          throw new Error(`Failed to find data subject with type: ${trigger['data-subject-type']}`);
        }
        dataSubjectId = subject.id;
      }

      // Resolve purpose tracking types to purpose IDs with matching states
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

      const input: Record<string, unknown> = {
        name: trigger.name,
        ...(existingTrigger ? { id: existingTrigger.id } : {}),
        triggerCondition: trigger['trigger-condition'] ?? '{}',
        ...(actionId ? { actionId } : {}),
        ...(dataSubjectId ? { dataSubjectId } : {}),
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
            /** Trigger name */
            name: string;
          };
        };
      }>(client, CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER, { input });

      // For newly created triggers, purposes must be attached via a follow-up update
      if (!existingTrigger && consentWorkflowTriggerPurposes?.length) {
        await makeGraphQLRequest(client, CREATE_OR_UPDATE_CONSENT_WORKFLOW_TRIGGER, {
          input: {
            id: triggerId,
            consentWorkflowTriggerPurposes,
          },
        });
      }

      logger.info(colors.green(`Successfully synced consent workflow trigger "${trigger.name}"!`));
    } catch (err) {
      encounteredError = true;
      logger.info(
        colors.red(`Failed to sync consent workflow trigger "${trigger.name}"! - ${err.message}`),
      );
    }
  });

  logger.info(colors.green(`Synced "${inputs.length}" consent workflow triggers!`));

  return !encounteredError;
}

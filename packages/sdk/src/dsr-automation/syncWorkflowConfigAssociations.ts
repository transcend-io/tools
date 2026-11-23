import { WorkflowConfigType } from '@transcend-io/privacy-types';
import { mapSeries, type Logger } from '@transcend-io/utils';
import type { GraphQLClient } from 'graphql-request';
import { keyBy } from 'lodash-es';

import { makeGraphQLRequest, NOOP_LOGGER } from '../api/makeGraphQLRequest.js';
import { fetchAllDataSilos } from '../data-inventory/fetchAllDataSilos.js';
import { fetchAllIdentifiers } from '../data-inventory/fetchAllIdentifiers.js';
import { diffTitleAssociations } from './diffTitleAssociations.js';
import { fetchAllWorkflowConfigs } from './fetchAllWorkflowConfigs.js';
import { fetchWorkflowConfigEnrichers } from './fetchWorkflowConfigAssociations.js';
import {
  ADD_DATA_SILO_TO_WORKFLOW_CONFIG,
  ADD_ENRICHERS_TO_WORKFLOW_CONFIG,
  REMOVE_DATA_SILO_FROM_WORKFLOW_CONFIG,
  REMOVE_ENRICHERS_FROM_WORKFLOW_CONFIG,
  UPDATE_WORKFLOW_CONFIG,
} from './gqls/workflowConfig.js';
import {
  resolveWorkflowConfigMatch,
  workflowConfigInputLabel,
} from './resolveWorkflowConfigMatch.js';
import { fetchAllEnrichers } from './syncEnrichers.js';
import type { WorkflowConfigSyncInput } from './syncWorkflowConfigs.js';

/** True when the YAML entry includes association fields to reconcile on push. */
function hasAssociationFields(config: WorkflowConfigSyncInput): boolean {
  return (
    config['data-silo-titles'] !== undefined ||
    config['preflight-titles'] !== undefined ||
    config['input-identifiers'] !== undefined
  );
}

/**
 * Sync workflow config associations after data silos and preflight checks exist.
 *
 * Only fields present in YAML are reconciled. Omitted fields leave remote associations unchanged.
 */
export async function syncWorkflowConfigAssociations(
  client: GraphQLClient,
  inputs: WorkflowConfigSyncInput[],
  options: {
    pageSize: number;
    logger?: Logger;
  },
): Promise<boolean> {
  const { pageSize, logger = NOOP_LOGGER } = options;
  const associationInputs = inputs.filter(hasAssociationFields);
  if (associationInputs.length === 0) {
    return true;
  }

  let encounteredError = false;

  const existingConfigs = await fetchAllWorkflowConfigs(client, {
    logger,
    workflowConfigType: WorkflowConfigType.DSR,
  });

  const needsIdentifiers = associationInputs.some((c) => c['input-identifiers'] !== undefined);
  const needsEnrichers = associationInputs.some((c) => c['preflight-titles'] !== undefined);
  const [identifiers, enrichers] = await Promise.all([
    needsIdentifiers ? fetchAllIdentifiers(client, { logger }) : [],
    needsEnrichers ? fetchAllEnrichers(client, { logger }) : [],
  ]);
  const identifierByName = keyBy(identifiers, 'name');
  const enricherByTitle = keyBy(enrichers, 'title');

  await mapSeries(associationInputs, async (config) => {
    const label = workflowConfigInputLabel(config);
    try {
      const resolution = resolveWorkflowConfigMatch(config, existingConfigs);
      if (resolution.kind !== 'match') {
        throw new Error(
          resolution.kind === 'ambiguous'
            ? `Found "${resolution.candidates.length}" workflow configs matching "${label}".`
            : `No workflow config found matching "${label}". Sync workflow settings before associations.`,
        );
      }

      const workflowConfigId = resolution.config.id;

      if (config['data-silo-titles'] !== undefined) {
        const desiredTitles = config['data-silo-titles'];
        const currentSilos = await fetchAllDataSilos(client, {
          workflowConfigId,
          pageSize,
          logger,
        });
        const { toAdd, toRemove } = diffTitleAssociations(
          currentSilos.map(({ title }) => title),
          desiredTitles,
        );

        if (toRemove.length > 0) {
          const removeIds = currentSilos
            .filter(({ title }) => toRemove.includes(title))
            .map(({ id }) => id);
          await makeGraphQLRequest(client, REMOVE_DATA_SILO_FROM_WORKFLOW_CONFIG, {
            variables: { input: { workflowConfigId, dataSiloIds: removeIds } },
            logger,
          });
        }

        if (toAdd.length > 0) {
          const allSilos = await fetchAllDataSilos(client, { titles: toAdd, pageSize, logger });
          const siloByTitle = keyBy(allSilos, 'title');
          const addIds = toAdd.map((title) => {
            const silo = siloByTitle[title];
            if (!silo) {
              throw new Error(`Unknown data silo "${title}" for workflow "${label}"`);
            }
            return silo.id;
          });
          await makeGraphQLRequest(client, ADD_DATA_SILO_TO_WORKFLOW_CONFIG, {
            variables: { input: { workflowConfigId, dataSiloIds: addIds } },
            logger,
          });
        }
      }

      if (config['preflight-titles'] !== undefined) {
        const desiredTitles = config['preflight-titles'];
        const currentEnrichers = await fetchWorkflowConfigEnrichers(client, workflowConfigId, {
          pageSize,
          logger,
        });
        const { toAdd, toRemove } = diffTitleAssociations(
          currentEnrichers.map(({ title }) => title),
          desiredTitles,
        );

        if (toRemove.length > 0) {
          const removeIds = currentEnrichers
            .filter(({ title }) => toRemove.includes(title))
            .map(({ id }) => id);
          await makeGraphQLRequest(client, REMOVE_ENRICHERS_FROM_WORKFLOW_CONFIG, {
            variables: { input: { workflowConfigId, enrichers: removeIds } },
            logger,
          });
        }

        if (toAdd.length > 0) {
          const enricherRows = toAdd.map((title) => {
            const enricher = enricherByTitle[title];
            if (!enricher) {
              throw new Error(`Unknown preflight check "${title}" for workflow "${label}"`);
            }
            return { id: enricher.id, isIdentifierSource: false };
          });
          await makeGraphQLRequest(client, ADD_ENRICHERS_TO_WORKFLOW_CONFIG, {
            variables: { input: { workflowConfigId, enrichers: enricherRows } },
            logger,
          });
        }
      }

      if (config['input-identifiers'] !== undefined) {
        const inputIdentifierIds = config['input-identifiers'].map((name) => {
          const identifier = identifierByName[name];
          if (!identifier) {
            throw new Error(`Unknown identifier "${name}" for workflow "${label}"`);
          }
          return identifier.id;
        });
        await makeGraphQLRequest(client, UPDATE_WORKFLOW_CONFIG, {
          variables: {
            input: {
              workflowConfigId,
              inputIdentifierIds,
            },
          },
          logger,
        });
      }

      logger.info(`Synced associations for workflow config "${label}" (${workflowConfigId})`);
    } catch (err) {
      encounteredError = true;
      logger.error(
        `Failed to sync associations for workflow config "${label}" - ${(err as Error).message}`,
      );
    }
  });

  return !encounteredError;
}

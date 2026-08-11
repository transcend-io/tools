import type { DataSiloEnriched, WorkflowConfigNode } from '@transcend-io/sdk';
import colors from 'colors';

import type { DataSiloInput, DeletionDependencyInput } from '../../codecs.js';
import { logger } from '../../logger.js';

/**
 * Build the `deletion-dependencies` entries for a data silo being pulled into transcend.yml.
 *
 * Global dependencies keep the string shorthand so that existing configurations round-trip
 * unchanged. Each workflow that overrides the global configuration is emitted as its own
 * entry, including overrides with no dependencies at all.
 *
 * @param dataSilo - The data silo being pulled
 * @param workflowConfigsById - The organization's erasure workflows, keyed by ID
 * @returns The `deletion-dependencies` field, or an empty object when there is nothing to write
 */
export function buildDeletionDependenciesInput(
  dataSilo: Pick<
    DataSiloEnriched,
    'title' | 'dependentDataSilos' | 'dependedOnDataSilosPerWorkflow'
  >,
  workflowConfigsById: Record<string, Pick<WorkflowConfigNode, 'internalName' | 'title'>>,
): Pick<DataSiloInput, 'deletion-dependencies'> {
  const { title, dependentDataSilos, dependedOnDataSilosPerWorkflow } = dataSilo;

  const overrides = dependedOnDataSilosPerWorkflow.flatMap(
    ({ workflowConfigId, dependedOnDataSilos }): DeletionDependencyInput[] => {
      const workflowConfig = workflowConfigsById[workflowConfigId];

      // transcend.yml references workflows by internal name, so an override on a workflow
      // without one cannot be expressed
      if (!workflowConfig?.internalName) {
        logger.warn(
          colors.yellow(
            `Skipping the deletion dependency override on data silo "${title}" for workflow ` +
              `"${workflowConfig?.title.defaultMessage ?? workflowConfigId}" because that ` +
              'workflow has no internal name.',
          ),
        );
        return [];
      }

      return [
        {
          workflow: workflowConfig.internalName,
          titles: dependedOnDataSilos.map(({ title }) => title),
        },
      ];
    },
  );

  const dependencies = [...dependentDataSilos.map(({ title }) => title), ...overrides];

  return dependencies.length > 0 ? { 'deletion-dependencies': dependencies } : {};
}

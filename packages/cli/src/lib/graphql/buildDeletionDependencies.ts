import type { DataSiloEnriched, WorkflowConfigNode } from '@transcend-io/sdk';
import colors from 'colors';

import type { DataSiloInput, DeletionDependencies, DeletionDependencyInput } from '../../codecs.js';
import { logger } from '../../logger.js';

/**
 * Build the `deletion-dependencies` entries for a data silo being pulled into transcend.yml.
 *
 * With no per-workflow overrides, global dependencies stay as a list of titles so existing
 * configurations round-trip unchanged. When overrides exist, the whole field is a list of
 * objects (`{ titles }` for global, `{ workflow, titles }` for each override).
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

  const globalTitles = dependentDataSilos.map(({ title }) => title);

  const workflowOverrides = dependedOnDataSilosPerWorkflow.flatMap(
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

  // If there are no global or workflow dependencies, return an empty object
  if (globalTitles.length === 0 && workflowOverrides.length === 0) {
    return {};
  }

  // If there are no workflow overrides, return the global titles as string[], to keep legacy behavior
  if (workflowOverrides.length === 0) {
    return { 'deletion-dependencies': globalTitles };
  }

  // If there are workflow overrides, return a list of objects
  return {
    'deletion-dependencies': [
      ...(globalTitles.length > 0 ? [{ titles: globalTitles }] : []),
      ...workflowOverrides,
    ],
  };
}

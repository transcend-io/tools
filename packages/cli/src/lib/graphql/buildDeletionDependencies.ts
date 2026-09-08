import type { DataSiloEnriched } from '@transcend-io/sdk';

import type { DataSiloInput } from '../../codecs.js';

/**
 * Build the `deletion-dependencies` entries for a data silo being pulled into transcend.yml.
 *
 * With no per-workflow overrides, global dependencies stay as a list of titles so existing
 * configurations round-trip unchanged. When overrides exist, the whole field is a list of
 * objects (`{ titles }` for global, `{ workflow, titles }` for each override).
 *
 * @param dataSilo - The data silo being pulled
 * @returns The `deletion-dependencies` field, or an empty object when there is nothing to write
 */
export function buildDeletionDependenciesInput(
  dataSilo: Pick<DataSiloEnriched, 'dependentDataSilos' | 'dependedOnDataSilosPerWorkflow'>,
): Pick<DataSiloInput, 'deletion-dependencies'> {
  const { dependentDataSilos, dependedOnDataSilosPerWorkflow } = dataSilo;

  const globalTitles = dependentDataSilos.map(({ title }) => title);

  const workflowOverrides = dependedOnDataSilosPerWorkflow.map(
    ({ workflowInternalName, dependedOnDataSilos }) => ({
      workflow: workflowInternalName,
      titles: dependedOnDataSilos.map(({ title }) => title),
    }),
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

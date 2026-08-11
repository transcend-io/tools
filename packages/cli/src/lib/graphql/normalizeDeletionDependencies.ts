import type { DependedOnDataSiloInput } from '@transcend-io/sdk';
import { uniq } from 'lodash-es';

import type { DeletionDependencies, DeletionDependencyObject } from '../../codecs.js';

/**
 * Convert the `deletion-dependencies` entries for a single data silo into the
 * `dependedOnDataSilos` input accepted by the `updateDataSilos` mutation.
 *
 * A list of titles becomes a single global entry. A list of objects may declare
 * the global configuration (`{ titles }`) and/or per-workflow overrides; workflows
 * that are absent from the list are left untouched.
 *
 * @param dependencies - The `deletion-dependencies` entries from transcend.yml
 * @param dataSiloTitle - Title of the data silo being synced, used in error messages
 * @returns The dependency entries to send to the API
 */
export function normalizeDeletionDependencies(
  dependencies: DeletionDependencies,
  dataSiloTitle: string,
): DependedOnDataSiloInput[] {
  if (dependencies.length === 0) {
    return [];
  }

  // Legacy / no-overrides form: a flat list of data silo titles
  if (typeof dependencies[0] === 'string') {
    return [{ titles: uniq(dependencies as string[]) }];
  }

  const globalTitles: string[] = [];
  let hasGlobalEntry = false;
  const workflowOverrides: DependedOnDataSiloInput[] = [];
  const seenWorkflows = new Set<string>();

  /**
   * Record an override for a single workflow, rejecting duplicates before the API does
   * so that the error names the data silo
   *
   * @param workflow - Internal name of the workflow being overridden
   * @param override - Titles or reset flag to send for that workflow
   */
  const addWorkflowOverride = (
    workflow: string,
    override: Omit<DependedOnDataSiloInput, 'workflowConfigInternalName'>,
  ): void => {
    if (seenWorkflows.has(workflow)) {
      throw new Error(
        `Data silo "${dataSiloTitle}" has multiple deletion-dependencies entries for workflow ` +
          `"${workflow}". Combine them into a single entry.`,
      );
    }
    seenWorkflows.add(workflow);
    workflowOverrides.push({ workflowConfigInternalName: workflow, ...override });
  };

  (dependencies as DeletionDependencyObject[]).forEach((dependency) => {
    // io-ts codecs allow extra properties, so this combination decodes cleanly
    // even though the two halves contradict each other
    if ('reset-to-global' in dependency && 'titles' in dependency) {
      throw new Error(
        `Data silo "${dataSiloTitle}" has a deletion-dependencies entry for workflow ` +
          `"${dependency.workflow}" that sets both "reset-to-global" and "titles". ` +
          'Use "titles: []" to override the global configuration with no dependencies, ' +
          'or "reset-to-global: true" to fall back to the global configuration.',
      );
    }

    if ('reset-to-global' in dependency) {
      addWorkflowOverride(dependency.workflow, { resetToGlobal: true });
      return;
    }

    if (dependency.workflow) {
      addWorkflowOverride(dependency.workflow, { titles: dependency.titles });
      return;
    }

    hasGlobalEntry = true;
    globalTitles.push(...dependency.titles);
  });

  // The API rejects duplicate titles, which are easy to introduce across multiple
  // global `{ titles }` entries
  return [...(hasGlobalEntry ? [{ titles: uniq(globalTitles) }] : []), ...workflowOverrides];
}

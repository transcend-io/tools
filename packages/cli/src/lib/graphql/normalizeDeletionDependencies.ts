import type { DependedOnDataSiloInput } from '@transcend-io/sdk';
import { uniq } from 'lodash-es';

import type { DeletionDependencyInput } from '../../codecs.js';

/**
 * Convert the `deletion-dependencies` entries for a single data silo into the
 * `dependedOnDataSilos` input accepted by the `updateDataSilos` mutation.
 *
 * Bare strings and entries without a `workflow` all describe the global configuration,
 * so they are merged into a single entry. Entries with a `workflow` become overrides
 * for that workflow only; workflows that are absent from the list are left untouched.
 *
 * @param dependencies - The `deletion-dependencies` entries from transcend.yml
 * @param dataSiloTitle - Title of the data silo being synced, used in error messages
 * @returns The dependency entries to send to the API
 */
export function normalizeDeletionDependencies(
  dependencies: DeletionDependencyInput[],
  dataSiloTitle: string,
): DependedOnDataSiloInput[] {
  const globalTitles: string[] = [];
  let hasGlobalEntry = false;
  const workflowEntries: DependedOnDataSiloInput[] = [];
  const seenWorkflows = new Set<string>();

  /**
   * Record an override for a single workflow, rejecting duplicates before the API does
   * so that the error names the data silo
   *
   * @param workflow - Internal name of the workflow being overridden
   * @param entry - The override to send for that workflow
   */
  const addWorkflowEntry = (
    workflow: string,
    entry: Omit<DependedOnDataSiloInput, 'workflowConfigInternalName'>,
  ): void => {
    if (seenWorkflows.has(workflow)) {
      throw new Error(
        `Data silo "${dataSiloTitle}" has multiple deletion-dependencies entries for workflow ` +
          `"${workflow}". Combine them into a single entry.`,
      );
    }
    seenWorkflows.add(workflow);
    workflowEntries.push({ workflowConfigInternalName: workflow, ...entry });
  };

  dependencies.forEach((dependency) => {
    if (typeof dependency === 'string') {
      hasGlobalEntry = true;
      globalTitles.push(dependency);
      return;
    }

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
      addWorkflowEntry(dependency.workflow, { resetToGlobal: true });
      return;
    }

    if (dependency.workflow) {
      addWorkflowEntry(dependency.workflow, { titles: dependency.titles });
      return;
    }

    hasGlobalEntry = true;
    globalTitles.push(...dependency.titles);
  });

  // The API rejects duplicate titles, which are easy to introduce by combining
  // the string shorthand with the object form
  return [...(hasGlobalEntry ? [{ titles: uniq(globalTitles) }] : []), ...workflowEntries];
}

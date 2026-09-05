import type { PersistedState } from '@transcend-io/persisted-state';
import { getValues, getEntries } from '@transcend-io/type-utils';
import { startCase } from 'lodash-es';

import { ColumnName, CachedFileState, IS_REQUIRED, CAN_APPLY_IN_BULK } from './constants.js';
import { fuzzyMatchColumns } from './fuzzyMatchColumns.js';
import { prompt, type RequestPrompt } from './prompt.js';

/**
 * Mapping from column name to request input parameter
 */
export type ColumnNameMap = {
  [k in ColumnName]?: string;
};

/** Runtime dependencies used while mapping CSV columns. */
export interface MapCsvColumnsToApiDependencies {
  /** Prompt capability used to collect column mappings. */
  readonly prompt: RequestPrompt;
}

const defaultDependencies: MapCsvColumnsToApiDependencies = {
  prompt,
};

/**
 * Determine the mapping between columns in CSV
 *
 * @param columnNames - The set of column names
 * @param state - The cached file state used to map DSR inputs
 * @param dependencies - Runtime dependencies.
 * @returns The column name mapping
 */
export async function mapCsvColumnsToApi(
  columnNames: string[],
  state: PersistedState<typeof CachedFileState>,
  dependencies: MapCsvColumnsToApiDependencies = defaultDependencies,
): Promise<ColumnNameMap> {
  // Determine the columns that should be mapped
  const columnQuestions = getValues(ColumnName).filter(
    (name) => !state.getValue('columnNames', name),
  );

  // Skip mapping when everything is mapped
  const columnNameMap =
    columnQuestions.length === 0
      ? {}
      : // prompt questions to map columns
        await dependencies.prompt<{
          [k in ColumnName]?: string;
        }>(
          columnQuestions.map((name) => {
            const field = startCase(name.replace('ColumnName', ''));
            const matches = fuzzyMatchColumns(
              columnNames,
              field,
              IS_REQUIRED[name],
              !!CAN_APPLY_IN_BULK[name],
            );
            return {
              name,
              message: `Choose the column that will be used to map in the field: ${field}`,
              type: 'list',
              default: matches[0],
              choices: matches,
            };
          }),
        );

  await Promise.all(getEntries(columnNameMap).map(([k, v]) => state.setValue(v, 'columnNames', k)));
  return columnNameMap;
}

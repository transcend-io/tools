import { search } from '@inquirer/prompts';
import { apply } from '@transcend-io/type-utils';

import { fuzzySearch } from './fuzzyMatchColumns.js';

/**
 * Map a set of inputs to a set of outputs
 *
 * @param csvInputs - Input list
 * @param expectedOutputs - Output list
 * @param cache - Cache
 * @returns Mapping from row to enum value
 */
export async function mapEnumValues<TValue extends string>(
  csvInputs: string[],
  expectedOutputs: TValue[],
  cache: { [k in string]: TValue },
): Promise<{ [k in string]: TValue }> {
  const inputs = csvInputs.map((item) => item || '<blank>').filter((value) => !cache[value]);
  if (inputs.length === 0) {
    return cache;
  }

  const result: { [k in string]: TValue } = {} as { [k in string]: TValue };
  for (const value of inputs) {
    result[value] = await search<TValue>({
      message: `Map value of: ${value}`,
      source: (term) => {
        const items = !term
          ? expectedOutputs
          : expectedOutputs.filter((x) => typeof x === 'string' && fuzzySearch(term, x));
        return items.map((v) => ({ value: v, name: v }));
      },
    });
  }

  return {
    ...cache,
    ...apply(result, (r) =>
      typeof r === 'string' ? (r as TValue) : (Object.values(r)[0] as TValue),
    ),
  };
}

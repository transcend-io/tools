import { apply, ObjByString } from '@transcend-io/type-utils';

import { fuzzySearch } from './fuzzyMatchColumns.js';
import { prompt, type RequestPrompt } from './prompt.js';

/** Runtime dependencies used while mapping enum values. */
export interface MapEnumValuesDependencies {
  /** Prompt capability used to collect enum mappings. */
  readonly prompt: RequestPrompt;
}

const defaultDependencies: MapEnumValuesDependencies = {
  prompt,
};

/**
 * Map a set of inputs to a set of outputs
 *
 * @param csvInputs - Input list
 * @param expectedOutputs - Output list
 * @param cache - Cache
 * @param dependencies - Runtime dependencies.
 * @returns Mapping from row to enum value
 */
export async function mapEnumValues<TValue extends string>(
  csvInputs: string[],
  expectedOutputs: TValue[],
  cache: { [k in string]: TValue },
  dependencies: MapEnumValuesDependencies = defaultDependencies,
): Promise<{ [k in string]: TValue }> {
  const inputs = csvInputs.map((item) => item || '<blank>').filter((value) => !cache[value]);
  if (inputs.length === 0) {
    return cache;
  }
  const result = await dependencies.prompt<{ [k in string]: TValue }>(
    inputs.map((value) => ({
      name: value,
      message: `Map value of: ${value}`,
      type: 'autocomplete',
      default: expectedOutputs.find((x) => fuzzySearch(value, x)),
      source: (answersSoFar: ObjByString, input: string) =>
        !input
          ? expectedOutputs
          : expectedOutputs.filter((x) => typeof x === 'string' && fuzzySearch(input, x)),
    })),
  );
  return {
    ...cache,
    ...apply(result, (r) =>
      typeof r === 'string' ? (r as TValue) : (Object.values(r)[0] as TValue),
    ),
  };
}

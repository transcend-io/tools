import type { CustomFunction } from './fetchAllCustomFunctions.js';
import type { CustomFunctionConfigInput } from './syncCustomFunction.js';

/**
 * Resolve which existing custom function a config refers to.
 *
 * When the config has an `id`, it must match an existing function. Otherwise
 * the function is matched by exact name; an ambiguous name (multiple existing
 * functions with the same name) is an error that the caller should resolve by
 * adding an `id` to the config.
 *
 * @param existing - All existing custom functions in the organization
 * @param input - The custom function config
 * @returns The matching custom function, or undefined when it should be created
 */
export function resolveExistingCustomFunction(
  existing: CustomFunction[],
  input: Pick<CustomFunctionConfigInput, 'id' | 'name'>,
): CustomFunction | undefined {
  if (input.id) {
    const match = existing.find(({ id }) => id === input.id);
    if (!match) {
      throw new Error(
        `Custom function "${input.name}" specifies id "${input.id}" but no custom function ` +
          'with that ID exists in the organization. Remove the id to create a new function, ' +
          'or fix the ID.',
      );
    }
    return match;
  }

  const matches = existing.filter(({ name }) => name === input.name);
  if (matches.length > 1) {
    throw new Error(
      `Multiple custom functions are named "${input.name}" ` +
        `(ids: ${matches.map(({ id }) => id).join(', ')}). ` +
        'Add an `id` field to this manifest entry to disambiguate which one to update.',
    );
  }
  return matches[0];
}

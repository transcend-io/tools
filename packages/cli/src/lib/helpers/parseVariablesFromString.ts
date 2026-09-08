/**
 * Parse parameters from a CLI string.
 *
 * @param parameters - Parameters as a string
 * @returns Parameters as an object
 */
export function parseParametersFromString(parameters: string): {
  [k in string]: string;
} {
  const entries = parameters.split(',').filter((entry) => !!entry);
  const parsed: { [k in string]: string } = {};
  entries.forEach((entry) => {
    const [k, v] = entry.split(':');
    if (!k || !v) {
      throw new Error(`Invalid parameter: ${entry}. Expected format: key:value`);
    }
    parsed[k] = v;
  });
  return parsed;
}

/** Backward-compatible name for {@link parseParametersFromString}. */
export const parseVariablesFromString = parseParametersFromString;

/**
 * Parse canonical parameter values while preserving the legacy variables flag.
 *
 * @param flags - Canonical and legacy CLI values
 * @returns Parameters keyed by placeholder name
 */
export function parseParametersFromFlags(flags: {
  /** Values passed through --parameters. */
  parameters: string;
  /** Values passed through the legacy --variables alias. */
  variables: string;
}): { [k in string]: string } {
  if (flags.parameters && flags.variables) {
    throw new Error('Pass either --parameters or --variables, not both.');
  }
  return parseParametersFromString(flags.parameters || flags.variables);
}

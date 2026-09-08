/**
 * Parse parameters from a CLI string.
 *
 * @param parameters - Parameters as a string
 * @returns Parameters as an object
 */
export function parseParametersFromString(parameters: string): {
  [k in string]: string;
} {
  const entries: string[] = [];
  let current = '';
  for (let index = 0; index < parameters.length; index += 1) {
    const character = parameters[index]!;
    const next = parameters[index + 1];
    if (character === '\\' && (next === ',' || next === '\\')) {
      current += next;
      index += 1;
    } else if (character === ',') {
      entries.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  entries.push(current);
  const parsed: { [k in string]: string } = {};
  entries.filter(Boolean).forEach((entry) => {
    const separator = entry.indexOf(':');
    if (separator <= 0 || separator === entry.length - 1) {
      throw new Error(`Invalid parameter: ${entry}. Expected format: key:value`);
    }
    const k = entry.slice(0, separator);
    const v = entry.slice(separator + 1);
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
  parameters?: string;
  /** Values passed through the legacy --variables alias. */
  variables?: string;
}): { [k in string]: string } {
  if (flags.parameters && flags.variables) {
    throw new Error('Pass either --parameters or --variables, not both.');
  }
  return parseParametersFromString(flags.parameters || flags.variables || '');
}

/**
 * Parse variables from a CLI string.
 *
 * @param variables - Variables as a string
 * @returns Variables as an object
 */
export function parseVariablesFromString(variables: string): {
  [k in string]: string;
} {
  const entries: string[] = [];
  let current = '';
  for (let index = 0; index < variables.length; index += 1) {
    const character = variables[index]!;
    const next = variables[index + 1];
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
      throw new Error(`Invalid variable: ${entry}. Expected format: key:value`);
    }
    const k = entry.slice(0, separator);
    const v = entry.slice(separator + 1);
    parsed[k] = v;
  });
  return parsed;
}

import { isAbsolute, join, resolve } from 'node:path';

/** Default local Custom Function project directory. */
export const DEFAULT_CUSTOM_FUNCTION_DIRECTORY = join('transcend', 'custom-functions');

/**
 * Resolve a possibly relative CLI input against a working directory.
 *
 * @param cwd - Process working directory
 * @param input - User path
 * @returns Absolute path
 */
export function resolveCliPath(cwd: string, input: string): string {
  return isAbsolute(input) ? resolve(input) : resolve(cwd, input);
}

import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** Default local Custom Function project directory. */
export const DEFAULT_CUSTOM_FUNCTION_DIRECTORY = 'transcend/custom-functions';

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

/**
 * Resolve one Custom Function project and its optional manifest override.
 *
 * @param cwd - Process working directory
 * @param options - User-provided paths
 * @returns Consistent absolute project paths
 */
export function resolveCustomFunctionProjectPaths(
  cwd: string,
  options: {
    /** Optional positional project directory. */
    directory?: string;
    /** Optional explicit manifest path. */
    manifest?: string;
  },
): {
  /** Project directory selected by the positional argument. */
  targetDirectory: string;
  /** Directory containing the manifest. */
  manifestDirectory: string;
  /** Absolute manifest path. */
  manifestPath: string;
} {
  const defaultTarget = resolveCliPath(cwd, DEFAULT_CUSTOM_FUNCTION_DIRECTORY);
  const positionalIsFrameworkDefault =
    options.manifest !== undefined && options.directory === DEFAULT_CUSTOM_FUNCTION_DIRECTORY;
  const requestedTarget =
    options.directory && !positionalIsFrameworkDefault
      ? resolveCliPath(cwd, options.directory)
      : defaultTarget;
  const manifestPath = options.manifest
    ? resolveCliPath(cwd, options.manifest)
    : join(requestedTarget, 'transcend-functions.yml');
  const manifestDirectory = dirname(manifestPath);
  const targetDirectory =
    options.directory && !positionalIsFrameworkDefault
      ? requestedTarget
      : options.manifest
        ? manifestDirectory
        : defaultTarget;
  const manifestRelativeToTarget = relative(targetDirectory, manifestPath);
  if (
    options.directory &&
    !positionalIsFrameworkDefault &&
    (manifestRelativeToTarget === '..' ||
      manifestRelativeToTarget.startsWith(`..${sep}`) ||
      isAbsolute(manifestRelativeToTarget))
  ) {
    throw new Error(
      `The manifest must be inside the Custom Function project directory. ` +
        `Received directory ${targetDirectory} and manifest ${manifestPath}.`,
    );
  }
  return { targetDirectory, manifestDirectory, manifestPath };
}

/**
 * Quote one value for the POSIX-compatible command snippets emitted by the CLI.
 *
 * @param value - Raw command argument
 * @returns Safely single-quoted argument
 */
export function quoteCliArgument(value: string): string {
  return `'${value.replace(/'/gu, "'\\''")}'`;
}

/**
 * Build project arguments for a generated Custom Function command.
 *
 * @param targetDirectory - Project directory
 * @param manifestPath - Explicit manifest
 * @returns Quoted positional directory and any required manifest override
 */
export function buildCustomFunctionProjectArguments(
  targetDirectory: string,
  manifestPath: string,
): string {
  const defaultManifest = join(targetDirectory, 'transcend-functions.yml');
  const manifestFlag =
    manifestPath === defaultManifest ? '' : ` --manifest=${quoteCliArgument(manifestPath)}`;
  return `${quoteCliArgument(targetDirectory)}${manifestFlag}`;
}

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
 * Prefer a portable path relative to the invocation directory.
 *
 * @param cwd - Process working directory
 * @param path - Absolute path
 * @returns Relative path when contained by cwd, otherwise the absolute path
 */
export function displayCliPath(cwd: string, path: string): string {
  const value = relative(cwd, path).split(sep).join('/');
  if (value.length === 0) {
    return '.';
  }
  if (value === '..' || value.startsWith('../') || isAbsolute(value)) {
    return path.split(sep).join('/');
  }
  return value;
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
 * Build a CLI variables argument with non-secret values suitable for local checks.
 *
 * @param variableNames - Manifest placeholder names
 * @returns Empty string or a leading-space-prefixed CLI argument
 */
export function buildPlaceholderVariablesArgument(variableNames: readonly string[]): string {
  if (variableNames.length === 0) {
    return '';
  }
  const value = variableNames.map((name) => `${name}:placeholder`).join(',');
  return ` --variables=${quoteCliArgument(value)}`;
}

/**
 * Build project arguments for a generated Custom Function command.
 *
 * @param targetDirectory - Project directory
 * @param manifestPath - Explicit manifest
 * @param cwd - Optional invocation directory for shorter human-readable paths
 * @returns Quoted positional directory and any required manifest override
 */
export function buildCustomFunctionProjectArguments(
  targetDirectory: string,
  manifestPath: string,
  cwd?: string,
): string {
  const defaultManifest = join(targetDirectory, 'transcend-functions.yml');
  const displayedTarget = cwd ? displayCliPath(cwd, targetDirectory) : targetDirectory;
  const displayedManifest = cwd ? displayCliPath(cwd, manifestPath) : manifestPath;
  const manifestFlag =
    manifestPath === defaultManifest ? '' : ` --manifest=${quoteCliArgument(displayedManifest)}`;
  return `${quoteCliArgument(displayedTarget)}${manifestFlag}`;
}

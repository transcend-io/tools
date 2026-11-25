import { join, resolve } from 'node:path';

import type { LocalContext } from '../../context.js';
import {
  collectProjectRelativePaths,
  discoverProjectRepository,
} from '../scaffolding/project-discovery.js';
import type { PolicyProjectState } from './policy-scaffold-model.js';
import {
  POLICY_MANIFEST_FILENAME,
  POLICY_STARTER_BUNDLE_DIRECTORY,
} from './policy-scaffold-templates.js';

/** Default local policy workspace directory (shared Regal config + bundles). */
export const DEFAULT_POLICY_PROJECT_DIRECTORY = 'transcend/policy';

/**
 * Resolve a selected policy project relative to the invocation directory.
 *
 * @param invocationDirectory - CLI working directory
 * @param directory - User-selected project directory
 * @returns Absolute policy project directory
 */
export function resolvePolicyProjectDirectory(
  invocationDirectory: string,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): string {
  return resolve(invocationDirectory, directory);
}

/**
 * Absolute path to the disposable starter publish directory under a workspace.
 *
 * @param workspaceDirectory - Absolute policy workspace directory
 * @returns Absolute starter bundle directory
 */
export function getPolicyStarterBundleDirectory(workspaceDirectory: string): string {
  return join(workspaceDirectory, POLICY_STARTER_BUNDLE_DIRECTORY);
}

/**
 * Resolve publishable bundle directories under a path.
 *
 * - If `directory` itself contains a `.manifest`, it is treated as one bundle.
 * - Otherwise immediate child directories that contain a `.manifest` are
 *   returned in sorted order (multi-bundle workspace). Folder names are not
 *   required to end in `-bundle`; that suffix is only the `policy new`
 *   scaffolding convention.
 *
 * @param context - Filesystem-bearing CLI context
 * @param directory - Absolute workspace or bundle directory
 * @returns Absolute bundle directories to lint / test
 */
export function discoverPolicyBundleDirectories(
  context: Pick<LocalContext, 'fs'>,
  directory: string,
): string[] {
  if (!context.fs.existsSync(directory) || !context.fs.statSync(directory).isDirectory()) {
    return [];
  }
  const manifestAtRoot = join(directory, POLICY_MANIFEST_FILENAME);
  if (context.fs.existsSync(manifestAtRoot) && context.fs.statSync(manifestAtRoot).isFile()) {
    return [directory];
  }
  return context.fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name))
    .filter((bundleDirectory) => {
      const manifestPath = join(bundleDirectory, POLICY_MANIFEST_FILENAME);
      return context.fs.existsSync(manifestPath) && context.fs.statSync(manifestPath).isFile();
    })
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Collect repository state required by the pure policy planner.
 *
 * @param context - CLI context
 * @param directory - User-selected target directory
 * @returns Policy project discovery state
 */
export function discoverPolicyProject(
  context: LocalContext,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): PolicyProjectState {
  const invocationDirectory = context.process.cwd();
  const targetDirectory = resolvePolicyProjectDirectory(invocationDirectory, directory);
  if (
    context.fs.existsSync(targetDirectory) &&
    !context.fs.statSync(targetDirectory).isDirectory()
  ) {
    throw new Error(`Policy target is not a directory: ${targetDirectory}`);
  }
  const repository = discoverProjectRepository(context, {
    invocationDirectory,
    targetDirectory,
    standaloneProjectRoot: invocationDirectory,
  });
  return {
    invocationDirectory,
    targetDirectory,
    ...repository,
    relativePaths: collectProjectRelativePaths(context, targetDirectory),
    relativeFilePaths: collectProjectRelativePaths(context, targetDirectory, {
      includeDirectories: false,
    }),
  };
}

/**
 * Resolve the starter bundle manifest path for a discovered workspace.
 *
 * @param state - Policy project state
 * @returns Absolute manifest path under the starter `{root}-bundle/`
 */
export function getPolicyManifestPath(state: PolicyProjectState): string {
  return join(getPolicyStarterBundleDirectory(state.targetDirectory), POLICY_MANIFEST_FILENAME);
}

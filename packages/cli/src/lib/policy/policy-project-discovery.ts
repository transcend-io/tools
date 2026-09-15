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

/** Default local policy workspace directory (shared Regal + schemas). */
export const DEFAULT_POLICY_PROJECT_DIRECTORY = 'transcend/policy';

/**
 * Default publishable bundle directory for lint / test / eval / publish.
 *
 * Init targets the workspace; these commands target a `{root}-bundle/` unit.
 */
export const DEFAULT_POLICY_BUNDLE_DIRECTORY = `${DEFAULT_POLICY_PROJECT_DIRECTORY}/${POLICY_STARTER_BUNDLE_DIRECTORY}`;

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

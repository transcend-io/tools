import { join, resolve } from 'node:path';

import type { LocalContext } from '../../context.js';
import {
  collectProjectRelativePaths,
  discoverProjectRepository,
} from '../scaffolding/project-discovery.js';
import type { PolicyProjectState } from './policy-scaffold-model.js';

/** Default local policy project directory. */
export const DEFAULT_POLICY_PROJECT_DIRECTORY = 'transcend/policy';

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
  const targetDirectory = resolve(invocationDirectory, directory);
  if (
    context.fs.existsSync(targetDirectory) &&
    !context.fs.statSync(targetDirectory).isDirectory()
  ) {
    throw new Error(`Policy target is not a directory: ${targetDirectory}`);
  }
  const repository = discoverProjectRepository(context, {
    targetDirectory,
    standaloneProjectRoot:
      targetDirectory === resolve(invocationDirectory, DEFAULT_POLICY_PROJECT_DIRECTORY)
        ? invocationDirectory
        : targetDirectory,
  });
  return {
    invocationDirectory,
    targetDirectory,
    ...repository,
    relativePaths: collectProjectRelativePaths(context, targetDirectory),
  };
}

/**
 * Resolve the bundle manifest path for a discovered project.
 *
 * @param state - Policy project state
 * @returns Absolute manifest path
 */
export function getPolicyManifestPath(state: PolicyProjectState): string {
  return join(state.targetDirectory, 'manifest.json');
}

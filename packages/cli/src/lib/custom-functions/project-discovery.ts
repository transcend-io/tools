import { extname, join, resolve } from 'node:path';

import type { LocalContext } from '../../context.js';
import {
  collectProjectRelativePaths,
  discoverProjectRepository,
  findExistingAncestor,
  findRepositoryRoot,
} from '../scaffolding/project-discovery.js';
import { parseCustomFunctionsManifest } from './manifest.js';
import { DEFAULT_CUSTOM_FUNCTION_DIRECTORY, resolveCustomFunctionProjectPaths } from './paths.js';
import type { CustomFunctionProjectState } from './scaffold-model.js';

/**
 * Find Custom Function manifests below the surrounding repository.
 *
 * @param context - CLI context
 * @param startDirectory - Existing directory from which to locate the repository
 * @returns Absolute manifest paths in stable order
 */
export function discoverCustomFunctionManifests(
  context: LocalContext,
  startDirectory: string,
): string[] {
  const existingAncestor = findExistingAncestor(context, startDirectory);
  const root = findRepositoryRoot(context, existingAncestor) ?? existingAncestor;
  const manifests: string[] = [];
  const visit = (directory: string): void => {
    context.fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      if (entry.name === '.git' || entry.name === '.worktrees' || entry.name === 'node_modules') {
        return;
      }
      const absolute = join(directory, entry.name);
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        visit(absolute);
      } else if (entry.isFile()) {
        if (entry.name === 'transcend-functions.yml') {
          manifests.push(absolute);
          return;
        }
        if (['.yml', '.yaml'].includes(extname(entry.name))) {
          try {
            if (context.fs.statSync(absolute).size > 256_000) {
              return;
            }
            parseCustomFunctionsManifest(context.fs.readFileSync(absolute, 'utf8'), {
              skipPathValidation: true,
            });
            manifests.push(absolute);
          } catch {
            // Most repository YAML files are not Custom Function manifests.
          }
        }
      }
    });
  };
  visit(root);
  return manifests.sort((left, right) => left.localeCompare(right));
}

/**
 * Collect all repository state required by the pure planners.
 *
 * @param context - CLI context
 * @param options - User-selected target paths
 * @returns Project state
 */
export function discoverCustomFunctionProject(
  context: LocalContext,
  options: {
    /** Optional positional directory. */
    directory?: string;
    /** Optional explicit manifest path. */
    manifest?: string;
  },
): CustomFunctionProjectState {
  const cwd = context.process.cwd();
  const { manifestDirectory, manifestPath, targetDirectory } = resolveCustomFunctionProjectPaths(
    cwd,
    options,
  );
  const repository = discoverProjectRepository(context, {
    targetDirectory,
    standaloneProjectRoot:
      targetDirectory === resolve(cwd, DEFAULT_CUSTOM_FUNCTION_DIRECTORY) ? cwd : targetDirectory,
  });
  const denoJsonc = join(manifestDirectory, 'deno.jsonc');
  const denoJson = join(manifestDirectory, 'deno.json');
  const denoConfigPath = context.fs.existsSync(denoJsonc) ? denoJsonc : denoJson;

  return {
    invocationDirectory: cwd,
    targetDirectory,
    ...repository,
    manifestDirectory,
    manifestPath,
    denoConfigPath,
    relativePaths: collectProjectRelativePaths(context, manifestDirectory),
  };
}

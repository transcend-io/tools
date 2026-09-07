import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { detect, type DetectResult } from 'package-manager-detector';

import type { LocalContext } from '../../../context.js';
import { AGENT_SKILL_TARGETS, type AgentSkillTarget } from './config.js';
import type { ProjectFileSnapshot } from './model.js';

/** Repository and target state collected before planning. */
export interface CustomFunctionProjectState {
  /** Absolute user-selected target directory. */
  targetDirectory: string;
  /** Directory relative to which manifest file references resolve. */
  manifestDirectory: string;
  /** Absolute manifest path. */
  manifestPath: string;
  /** Nearest repository root, when present. */
  repositoryRoot?: string;
  /** Existing Deno configuration path, or desired deno.json path. */
  denoConfigPath: string;
  /** Existing package manifest path, when found. */
  packageJsonPath?: string;
  /** Detected package manager. */
  packageManager?: DetectResult;
  /** Whether pnpm requires an explicit workspace-root install. */
  pnpmWorkspaceRoot: boolean;
  /** Detected coding-agent targets. */
  detectedAgents: AgentSkillTarget[];
  /** Whether the repository appears to use GitHub. */
  usesGithub: boolean;
  /** Case-preserving relative paths below the manifest directory. */
  relativePaths: string[];
}

/**
 * Resolve a possibly relative input against the context working directory.
 *
 * @param cwd - Process working directory
 * @param input - User path
 * @returns Absolute path
 */
export function resolveCliPath(cwd: string, input: string): string {
  return isAbsolute(input) ? resolve(input) : resolve(cwd, input);
}

/**
 * Read a UTF-8 file snapshot through the command context.
 *
 * @param context - CLI context
 * @param path - Absolute path
 * @returns Snapshot
 */
export function readProjectFileSnapshot(context: LocalContext, path: string): ProjectFileSnapshot {
  if (!context.fs.existsSync(path)) {
    return { path, contents: null };
  }
  const stat = context.fs.lstatSync(path);
  if (!stat.isFile()) {
    throw new Error(`Expected a regular file: ${path}`);
  }
  return {
    path,
    contents: context.fs.readFileSync(path, 'utf8'),
    mode: stat.mode,
  };
}

/**
 * Walk upward for a repository marker.
 *
 * @param context - CLI context
 * @param startDirectory - Starting directory
 * @returns Nearest repository root
 */
function findRepositoryRoot(context: LocalContext, startDirectory: string): string | undefined {
  let current = startDirectory;
  while (true) {
    if (context.fs.existsSync(join(current, '.git'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

/**
 * Find the nearest existing ancestor of a target that may not exist yet.
 *
 * @param context - CLI context
 * @param target - Absolute target
 * @returns Existing directory
 */
function findExistingAncestor(context: LocalContext, target: string): string {
  let current = target;
  while (!context.fs.existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) {
      return current;
    }
    current = parent;
  }
  const stat = context.fs.statSync(current);
  return stat.isDirectory() ? current : dirname(current);
}

/**
 * Collect relative paths for collision checks.
 *
 * @param context - CLI context
 * @param root - Manifest directory
 * @returns Relative file/link paths
 */
function collectRelativePaths(context: LocalContext, root: string): string[] {
  if (!context.fs.existsSync(root)) {
    return [];
  }
  const paths: string[] = [];
  const visit = (directory: string): void => {
    context.fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        return;
      }
      const absolute = join(directory, entry.name);
      paths.push(relative(root, absolute).split(sep).join('/'));
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        visit(absolute);
      }
    });
  };
  visit(root);
  return paths.sort((left, right) => left.localeCompare(right));
}

/**
 * Detect coding agents from project and home markers.
 *
 * @param context - CLI context
 * @param repositoryRoot - Repository root or target
 * @returns Detected targets
 */
function detectAgentTargets(context: LocalContext, repositoryRoot: string): AgentSkillTarget[] {
  const home = context.process.env.HOME ?? homedir();
  return AGENT_SKILL_TARGETS.filter((target) =>
    [
      ...target.projectMarkers.map((marker) => join(repositoryRoot, marker)),
      ...target.homeMarkers.map((marker) => join(home, marker)),
    ].some((marker) => context.fs.existsSync(marker)),
  );
}

/**
 * Detect whether a git repository points at GitHub.
 *
 * @param context - CLI context
 * @param repositoryRoot - Repository root
 * @returns Whether GitHub setup is applicable
 */
function repositoryUsesGithub(context: LocalContext, repositoryRoot: string | undefined): boolean {
  if (!repositoryRoot) {
    return false;
  }
  if (context.fs.existsSync(join(repositoryRoot, '.github'))) {
    return true;
  }
  const gitMarker = join(repositoryRoot, '.git');
  let gitDirectory = gitMarker;
  if (context.fs.existsSync(gitMarker) && context.fs.statSync(gitMarker).isFile()) {
    const marker = context.fs.readFileSync(gitMarker, 'utf8').match(/^gitdir:\s*(.+)$/mu)?.[1];
    if (marker) {
      gitDirectory = resolve(repositoryRoot, marker);
    }
  }
  const configPath = join(gitDirectory, 'config');
  return (
    context.fs.existsSync(configPath) &&
    context.fs.readFileSync(configPath, 'utf8').includes('github.com')
  );
}

/**
 * Collect all repository state required by the pure planners.
 *
 * @param context - CLI context
 * @param options - User-selected target paths
 * @returns Project state
 */
export async function discoverCustomFunctionProject(
  context: LocalContext,
  options: {
    /** Optional positional directory. */
    directory?: string;
    /** Optional explicit manifest path. */
    manifest?: string;
  },
): Promise<CustomFunctionProjectState> {
  const cwd = context.process.cwd();
  const targetDirectory = resolveCliPath(cwd, options.directory ?? '.');
  const manifestPath = options.manifest
    ? resolveCliPath(cwd, options.manifest)
    : join(targetDirectory, 'transcend-functions.yml');
  const manifestDirectory = dirname(manifestPath);
  const existingAncestor = findExistingAncestor(context, targetDirectory);
  const repositoryRoot = findRepositoryRoot(context, existingAncestor);
  const denoJsonc = join(manifestDirectory, 'deno.jsonc');
  const denoJson = join(manifestDirectory, 'deno.json');
  const denoConfigPath = context.fs.existsSync(denoJsonc) ? denoJsonc : denoJson;
  const packageRoot = repositoryRoot ?? existingAncestor;
  const packageJsonCandidate = join(packageRoot, 'package.json');
  const packageJsonPath = context.fs.existsSync(packageJsonCandidate)
    ? packageJsonCandidate
    : undefined;
  const packageManager = packageJsonPath
    ? ((await detect({
        cwd: manifestDirectory,
        stopDir: packageRoot,
        strategies: ['lockfile', 'packageManager-field', 'devEngines-field'],
      })) ?? undefined)
    : undefined;
  const pnpmWorkspaceRoot =
    packageManager?.name === 'pnpm' &&
    context.fs.existsSync(join(packageRoot, 'pnpm-workspace.yaml'));

  return {
    targetDirectory,
    manifestDirectory,
    manifestPath,
    ...(repositoryRoot ? { repositoryRoot } : {}),
    denoConfigPath,
    ...(packageJsonPath ? { packageJsonPath } : {}),
    ...(packageManager ? { packageManager } : {}),
    pnpmWorkspaceRoot,
    detectedAgents: detectAgentTargets(context, repositoryRoot ?? targetDirectory),
    usesGithub: repositoryUsesGithub(context, repositoryRoot),
    relativePaths: collectRelativePaths(context, manifestDirectory),
  };
}

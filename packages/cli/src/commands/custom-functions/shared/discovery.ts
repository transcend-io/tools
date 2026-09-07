import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import type { LocalContext } from '../../../context.js';
import {
  AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES,
  PROJECT_SKILL_DIRECTORIES,
} from './config.js';
import type { ProjectFileSnapshot } from './model.js';

/** Default local Custom Function project directory. */
export const DEFAULT_CUSTOM_FUNCTION_DIRECTORY = join('transcend', 'custom-functions');

/** One existing project-level skill container. */
export interface ExistingProjectSkillDirectory {
  /** Repository-relative directory. */
  path: string;
  /** Whether its agent can read the portable `.agents/skills` directory. */
  supportsAgentsSkills: boolean;
}

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
  /** Existing project-level skill directories; home state is deliberately ignored. */
  existingSkillDirectories: ExistingProjectSkillDirectory[];
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
      if (entry.isFile() && entry.name === 'transcend-functions.yml') {
        manifests.push(absolute);
      } else if (entry.isDirectory() && !entry.isSymbolicLink()) {
        visit(absolute);
      }
    });
  };
  visit(root);
  return manifests.sort((left, right) => left.localeCompare(right));
}

/**
 * Determine whether a skill container has a SKILL.md within three levels.
 *
 * @param context - CLI context
 * @param directory - Candidate skill container
 * @param depth - Remaining nested directory levels
 * @returns Whether a skill exists below the container
 */
function containsSkill(context: LocalContext, directory: string, depth: number): boolean {
  if (depth === 0) {
    return false;
  }
  return context.fs.readdirSync(directory, { withFileTypes: true }).some((entry) => {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      return false;
    }
    const child = join(directory, entry.name);
    return (
      context.fs.existsSync(join(child, 'SKILL.md')) || containsSkill(context, child, depth - 1)
    );
  });
}

/**
 * Find existing project skill containers without consulting home directories.
 *
 * @param context - CLI context
 * @param repositoryRoot - Repository root or target
 * @returns Existing containers and `.agents/skills` compatibility
 */
function detectExistingSkillDirectories(
  context: LocalContext,
  repositoryRoot: string,
): ExistingProjectSkillDirectory[] {
  if (
    !context.fs.existsSync(repositoryRoot) ||
    !context.fs.statSync(repositoryRoot).isDirectory()
  ) {
    return [];
  }
  const compatible = new Set<string>(AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES);
  const candidates = new Set<string>([
    ...PROJECT_SKILL_DIRECTORIES,
    ...AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES,
  ]);
  context.fs.readdirSync(repositoryRoot, { withFileTypes: true }).forEach((entry) => {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      return;
    }
    const skillsDirectory = join(repositoryRoot, entry.name, 'skills');
    if (
      context.fs.existsSync(skillsDirectory) &&
      context.fs.statSync(skillsDirectory).isDirectory() &&
      containsSkill(context, skillsDirectory, 3)
    ) {
      candidates.add(`${entry.name}/skills`);
    }
  });
  return [...candidates]
    .filter((candidate) => {
      const path = join(repositoryRoot, candidate);
      return context.fs.existsSync(path) && context.fs.statSync(path).isDirectory();
    })
    .sort((left, right) => left.localeCompare(right))
    .map((path) => ({
      path,
      supportsAgentsSkills: compatible.has(path),
    }));
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
  const manifestPath = options.manifest
    ? resolveCliPath(cwd, options.manifest)
    : join(
        resolveCliPath(cwd, options.directory ?? DEFAULT_CUSTOM_FUNCTION_DIRECTORY),
        'transcend-functions.yml',
      );
  const manifestDirectory = dirname(manifestPath);
  const targetDirectory = options.directory
    ? resolveCliPath(cwd, options.directory)
    : options.manifest
      ? manifestDirectory
      : resolveCliPath(cwd, DEFAULT_CUSTOM_FUNCTION_DIRECTORY);
  const existingAncestor = findExistingAncestor(context, targetDirectory);
  const repositoryRoot = findRepositoryRoot(context, existingAncestor);
  const denoJsonc = join(manifestDirectory, 'deno.jsonc');
  const denoJson = join(manifestDirectory, 'deno.json');
  const denoConfigPath = context.fs.existsSync(denoJsonc) ? denoJsonc : denoJson;
  const agentRoot = repositoryRoot ?? targetDirectory;

  return {
    targetDirectory,
    manifestDirectory,
    manifestPath,
    ...(repositoryRoot ? { repositoryRoot } : {}),
    denoConfigPath,
    existingSkillDirectories: detectExistingSkillDirectories(context, agentRoot),
    usesGithub: repositoryUsesGithub(context, repositoryRoot),
    relativePaths: collectRelativePaths(context, manifestDirectory),
  };
}

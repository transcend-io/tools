import { dirname, join, relative, resolve, sep } from 'node:path';

import type { LocalContext } from '../../context.js';
import {
  AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES,
  PROJECT_SKILL_DIRECTORIES,
  type ExistingProjectSkillDirectory,
} from './agent-skill.js';
import type { PlanningPathSnapshot } from './project-plan.js';

/** Repository-level state shared by project scaffolds. */
export interface ProjectRepositoryState {
  /** Root that owns repository-level setup. */
  projectRoot: string;
  /** Nearest repository root, when present. */
  repositoryRoot?: string;
  /** Existing project-level skill directories. */
  existingSkillDirectories: ExistingProjectSkillDirectory[];
  /** Whether the repository appears to use GitHub. */
  usesGithub: boolean;
}

/**
 * Collect candidate paths once, before preview.
 *
 * @param context - CLI context
 * @param paths - Absolute paths
 * @returns In-memory path snapshots
 */
export function collectPlanningSnapshots(
  context: LocalContext,
  paths: readonly string[],
): Readonly<Record<string, PlanningPathSnapshot>> {
  return Object.fromEntries(
    paths.map((path): [string, PlanningPathSnapshot] => {
      try {
        const stat = context.fs.lstatSync(path);
        if (stat.isSymbolicLink()) {
          return [path, { kind: 'link', path, target: context.fs.readlinkSync(path) }];
        }
        if (stat.isDirectory()) {
          return [path, { kind: 'directory', path }];
        }
        if (!stat.isFile()) {
          throw new Error(`Unsupported filesystem entry: ${path}`);
        }
        return [
          path,
          {
            kind: 'file',
            path,
            contents: context.fs.readFileSync(path, 'utf8'),
            mode: stat.mode,
          },
        ];
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return [path, { kind: 'absent', path }];
        }
        throw error;
      }
    }),
  );
}

/**
 * Walk upward for a repository marker.
 *
 * @param context - CLI context
 * @param startDirectory - Starting directory
 * @returns Nearest repository root
 */
export function findRepositoryRoot(
  context: LocalContext,
  startDirectory: string,
): string | undefined {
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
export function findExistingAncestor(context: LocalContext, target: string): string {
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
 * Collect relative paths below a project directory for collision checks.
 *
 * @param context - CLI context
 * @param root - Directory to inspect
 * @returns Relative file, link, and directory paths
 */
export function collectProjectRelativePaths(context: LocalContext, root: string): string[] {
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
 * @param projectRoot - Repository root or standalone project root
 * @returns Existing containers and `.agents/skills` compatibility
 */
export function detectExistingProjectSkillDirectories(
  context: LocalContext,
  projectRoot: string,
): ExistingProjectSkillDirectory[] {
  if (!context.fs.existsSync(projectRoot) || !context.fs.statSync(projectRoot).isDirectory()) {
    return [];
  }
  const compatible = new Set<string>(AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES);
  const candidates = new Set<string>([
    ...PROJECT_SKILL_DIRECTORIES,
    ...AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES,
  ]);
  context.fs.readdirSync(projectRoot, { withFileTypes: true }).forEach((entry) => {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      return;
    }
    const skillsDirectory = join(projectRoot, entry.name, 'skills');
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
      const path = join(projectRoot, candidate);
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
export function repositoryUsesGithub(
  context: LocalContext,
  repositoryRoot: string | undefined,
): boolean {
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
 * Discover repository-owned state for a project scaffold.
 *
 * @param context - CLI context
 * @param options - Target and standalone root
 * @returns Repository-level project state
 */
export function discoverProjectRepository(
  context: LocalContext,
  options: {
    /** Absolute project target used to locate a surrounding repository. */
    targetDirectory: string;
    /** Root to use when the target is not inside a repository. */
    standaloneProjectRoot: string;
  },
): ProjectRepositoryState {
  const existingAncestor = findExistingAncestor(context, options.targetDirectory);
  const repositoryRoot = findRepositoryRoot(context, existingAncestor);
  const projectRoot = repositoryRoot ?? options.standaloneProjectRoot;
  return {
    projectRoot,
    ...(repositoryRoot ? { repositoryRoot } : {}),
    existingSkillDirectories: detectExistingProjectSkillDirectories(context, projectRoot),
    usesGithub: repositoryUsesGithub(context, repositoryRoot),
  };
}

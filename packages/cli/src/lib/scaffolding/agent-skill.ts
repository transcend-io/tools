import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';

import {
  getPlanningFileSnapshot,
  getPlanningPathSnapshot,
  planFileChange,
  type PlannedChange,
  type PlannedLinkChange,
  type PlanningPathSnapshot,
} from './project-plan.js';

/** Universal project-level Agent Skills directory. */
export const UNIVERSAL_AGENT_SKILLS_DIRECTORY = '.agents/skills';

/**
 * Unambiguous agent-owned project directories from vercel-labs/skills at
 * 1682051d48c34f5eb135e6475c1a965dce05e820. Generic skill catalog paths such
 * as `skills` and `data/skills` are excluded because they do not prove that a
 * project has configured an agent.
 */
export const PROJECT_SKILL_DIRECTORIES = [
  '.aider-desk/skills',
  UNIVERSAL_AGENT_SKILLS_DIRECTORY,
  '.autohand/skills',
  '.augment/skills',
  '.bob/skills',
  '.claude/skills',
  '.codeartsdoer/skills',
  '.codebuddy/skills',
  '.codemaker/skills',
  '.codestudio/skills',
  '.commandcode/skills',
  '.continue/skills',
  '.cortex/skills',
  '.crush/skills',
  '.devin/skills',
  '.factory/skills',
  'agent/skills',
  '.forge/skills',
  '.goose/skills',
  '.grok/skills',
  '.hermes/skills',
  '.inferencesh/skills',
  '.jazz/skills',
  '.junie/skills',
  '.iflow/skills',
  '.kilocode/skills',
  '.kimchi/skills',
  '.kiro/skills',
  '.kode/skills',
  '.lingma/skills',
  '.mcpjam/skills',
  '.minimax/skills',
  '.vibe/skills',
  '.moxby/skills',
  '.mux/skills',
  '.openhands/skills',
  '.ona/skills',
  '.pi/skills',
  '.posit/assistant/skills',
  '.qoder/skills',
  '.qwen/skills',
  '.reasonix/skills',
  '.rovodev/skills',
  '.roo/skills',
  '.tabnine/agent/skills',
  '.terramind/skills',
  '.tinycloud/skills',
  '.trae/skills',
  '.windsurf/skills',
  '.zcode/skills',
  '.zencoder/skills',
  '.neovate/skills',
  '.pochi/skills',
  '.adal/skills',
] as const;

/**
 * Existing legacy/native project directories for agents that the pinned
 * registry installs through `.agents/skills`.
 */
export const AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES = [
  UNIVERSAL_AGENT_SKILLS_DIRECTORY,
  '.cursor/skills',
  '.codex/skills',
  '.github/skills',
  '.gemini/skills',
  '.opencode/skills',
  '.cline/skills',
  '.warp/skills',
  '.zed/skills',
  '.replit/skills',
] as const;

/** One existing project-level skill container. */
export interface ExistingProjectSkillDirectory {
  /** Repository-relative directory. */
  path: string;
  /** Whether its agent can read the universal Agent Skills directory. */
  supportsAgentsSkills: boolean;
}

/** One source file in a managed Agent Skill. */
export interface AgentSkillFile {
  /** Path relative to the skill directory. */
  path: string;
  /** Complete Markdown contents. */
  contents: string;
}

/** Portable definition of one CLI-managed Agent Skill. */
export interface ManagedAgentSkillDefinition {
  /** Namespaced skill directory name. */
  name: string;
  /** Human-readable domain name used in plan descriptions. */
  displayName: string;
  /** Stable tool identifier written into integrity markers. */
  owner: string;
  /** Complete portable file set. */
  files: readonly AgentSkillFile[];
}

/** Pure planned mutations for one managed Agent Skill. */
export interface ManagedAgentSkillPlan {
  /** Skill file and link changes. */
  changes: PlannedChange[];
  /** Skill paths already in their desired state. */
  unchanged: string[];
}

/**
 * Choose one canonical skill directory and aliases for incompatible agents.
 *
 * @param existingDirectories - Existing project-level skill containers
 * @returns Canonical and alias directories
 */
export function resolveAgentSkillDirectories(
  existingDirectories: readonly ExistingProjectSkillDirectory[],
): {
  /** Directory that owns the canonical skill. */
  canonical: string;
  /** Existing directories that require links to the canonical skill. */
  aliases: string[];
} {
  if (existingDirectories.length === 1) {
    return { canonical: existingDirectories[0]!.path, aliases: [] };
  }
  return {
    canonical: UNIVERSAL_AGENT_SKILLS_DIRECTORY,
    aliases:
      existingDirectories.length > 1
        ? existingDirectories
            .filter(({ path, supportsAgentsSkills }) => {
              return path !== UNIVERSAL_AGENT_SKILLS_DIRECTORY && !supportsAgentsSkills;
            })
            .map(({ path }) => path)
        : [],
  };
}

/**
 * Add a digest marker to CLI-managed skill contents.
 *
 * @param contents - Skill Markdown
 * @param owner - Stable tool identifier
 * @returns Managed skill contents
 */
export function buildManagedAgentSkill(contents: string, owner: string): string {
  const body = contents.trimEnd();
  const digest = createHash('sha256').update(body).digest('hex');
  return `${body}\n\n<!-- managed-by: ${owner}; content-sha256: ${digest} -->\n`;
}

/**
 * Check whether managed skill contents still match their recorded digest.
 *
 * @param contents - Existing skill Markdown
 * @param owner - Stable tool identifier
 * @returns Whether automatic replacement is safe
 */
export function isUnmodifiedManagedAgentSkill(contents: string, owner: string): boolean {
  const escapedOwner = owner.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const marker = contents.match(
    new RegExp(`<!-- managed-by: ${escapedOwner}; content-sha256: ([a-f0-9]{64}) -->\\s*$`, 'u'),
  );
  if (!marker || marker.index === undefined) {
    return false;
  }
  const body = contents.slice(0, marker.index).trimEnd();
  return createHash('sha256').update(body).digest('hex') === marker[1];
}

/**
 * Enumerate paths that may be touched while installing a managed Agent Skill.
 *
 * @param rootDirectory - Root that owns project-level skill directories
 * @param existingDirectories - Existing project-level skill containers
 * @param skill - Managed skill definition
 * @returns Absolute candidate paths
 */
export function getManagedAgentSkillCandidatePaths(
  rootDirectory: string,
  existingDirectories: readonly ExistingProjectSkillDirectory[],
  skill: ManagedAgentSkillDefinition,
): string[] {
  const directories = resolveAgentSkillDirectories(existingDirectories);
  const paths = new Set<string>();
  const canonicalDirectory = join(rootDirectory, directories.canonical, skill.name);
  skill.files.forEach(({ path }) => paths.add(join(canonicalDirectory, path)));
  directories.aliases.forEach((directory) => {
    const aliasDirectory = join(rootDirectory, directory, skill.name);
    paths.add(aliasDirectory);
    skill.files.forEach(({ path }) => paths.add(join(aliasDirectory, path)));
  });
  return [...paths].sort((left, right) => left.localeCompare(right));
}

/**
 * Plan one direct managed skill installation and links into other existing directories.
 *
 * @param input - Root, discovered directories, snapshots, and skill definition
 * @returns Pure skill plan
 */
export function planManagedAgentSkill(input: {
  /** Root that owns project-level skill directories. */
  rootDirectory: string;
  /** Existing project-level skill containers. */
  existingDirectories: readonly ExistingProjectSkillDirectory[];
  /** Potential mutation paths keyed by absolute path. */
  snapshots: Readonly<Record<string, PlanningPathSnapshot>>;
  /** Managed skill definition. */
  skill: ManagedAgentSkillDefinition;
}): ManagedAgentSkillPlan {
  const { rootDirectory, existingDirectories, snapshots, skill } = input;
  const plan: ManagedAgentSkillPlan = { changes: [], unchanged: [] };
  const directories = resolveAgentSkillDirectories(existingDirectories);
  const canonicalDirectory = join(rootDirectory, directories.canonical, skill.name);
  const managedFiles = skill.files.map((file) => ({
    path: file.path,
    contents: buildManagedAgentSkill(file.contents, skill.owner),
  }));
  const planManagedFiles = (directory: string, description: string): void => {
    managedFiles.forEach((file) => {
      const path = join(directory, file.path);
      const snapshot = getPlanningFileSnapshot(snapshots, path);
      if (
        snapshot.contents !== null &&
        snapshot.contents !== file.contents &&
        !isUnmodifiedManagedAgentSkill(snapshot.contents, skill.owner)
      ) {
        throw new Error(
          `Refusing to replace user-managed skill: ${path}. Apply the skill update manually.`,
        );
      }
      const change = planFileChange({
        snapshot,
        after: file.contents,
        description: `${description}: ${file.path}`,
      });
      if (change) {
        plan.changes.push(change);
      } else {
        plan.unchanged.push(path);
      }
    });
  };
  planManagedFiles(canonicalDirectory, `Install ${skill.displayName} skill file`);

  directories.aliases.forEach((directory) => {
    const targetDirectory = join(rootDirectory, directory, skill.name);
    const snapshot = getPlanningPathSnapshot(snapshots, targetDirectory);
    const relativeTarget = relative(dirname(targetDirectory), canonicalDirectory);
    if (snapshot.kind === 'link' && snapshot.target === relativeTarget) {
      plan.unchanged.push(targetDirectory);
      return;
    }
    if (snapshot.kind === 'directory') {
      planManagedFiles(targetDirectory, `Update ${skill.displayName} skill copy in ${directory}`);
      return;
    }
    if (snapshot.kind !== 'absent') {
      throw new Error(`Refusing to replace unexpected skill target: ${targetDirectory}`);
    }
    const change: PlannedLinkChange = {
      kind: 'link',
      path: targetDirectory,
      target: relativeTarget,
      fallbackFiles: managedFiles,
      description: `Expose the canonical skill in ${directory}`,
    };
    plan.changes.push(change);
  });

  return plan;
}

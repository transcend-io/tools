import { createHash } from 'node:crypto';

/** Universal project-level Agent Skills directory. */
export const UNIVERSAL_AGENT_SKILLS_DIRECTORY = '.agents/skills';

/**
 * Project skill directories from vercel-labs/skills at
 * 1682051d48c34f5eb135e6475c1a965dce05e820.
 */
export const PROJECT_SKILL_DIRECTORIES = [
  '.aider-desk/skills',
  UNIVERSAL_AGENT_SKILLS_DIRECTORY,
  'data/skills',
  '.autohand/skills',
  '.augment/skills',
  '.bob/skills',
  '.claude/skills',
  'skills',
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

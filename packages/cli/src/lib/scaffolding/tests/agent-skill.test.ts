import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES,
  buildManagedAgentSkill,
  getManagedAgentSkillCandidatePaths,
  isUnmodifiedManagedAgentSkill,
  planManagedAgentSkill,
  PROJECT_SKILL_DIRECTORIES,
  resolveAgentSkillDirectories,
  type ManagedAgentSkillDefinition,
} from '../agent-skill.js';
import type { PlanningPathSnapshot } from '../project-plan.js';

/** Synthetic multi-file skill used to exercise the shared planner. */
const MANAGED_SKILL: ManagedAgentSkillDefinition = {
  name: 'example-skill',
  displayName: 'Example',
  owner: 'test-owner',
  files: [
    { path: 'SKILL.md', contents: '# Example\n' },
    { path: 'references/setup.md', contents: '# Setup\n' },
  ],
};

/**
 * Build absent snapshots for every candidate path.
 *
 * @param paths - Absolute planning candidates
 * @returns Snapshot record
 */
function absentSnapshots(paths: readonly string[]): Record<string, PlanningPathSnapshot> {
  return Object.fromEntries(paths.map((path) => [path, { kind: 'absent', path }]));
}

describe('project skill directory registry', () => {
  it('tracks unambiguous agent-owned paths from vercel-labs/skills', () => {
    expect(PROJECT_SKILL_DIRECTORIES).toEqual([
      '.aider-desk/skills',
      '.agents/skills',
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
    ]);
    expect(PROJECT_SKILL_DIRECTORIES).not.toContain('skills');
    expect(PROJECT_SKILL_DIRECTORIES).not.toContain('data/skills');
    expect(AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES).toContain('.cursor/skills');
  });
});

describe('resolveAgentSkillDirectories', () => {
  it('uses one existing directory directly', () => {
    expect(
      resolveAgentSkillDirectories([{ path: '.claude/skills', supportsAgentsSkills: false }]),
    ).toEqual({ canonical: '.claude/skills', aliases: [] });
  });

  it('uses the universal directory and links only incompatible agents', () => {
    expect(
      resolveAgentSkillDirectories([
        { path: '.cursor/skills', supportsAgentsSkills: true },
        { path: '.claude/skills', supportsAgentsSkills: false },
      ]),
    ).toEqual({
      canonical: '.agents/skills',
      aliases: ['.claude/skills'],
    });
  });
});

describe('managed Agent Skills', () => {
  it('recognizes unchanged content and rejects edits', () => {
    const managed = buildManagedAgentSkill('# Example\n', 'test-owner');

    expect(isUnmodifiedManagedAgentSkill(managed, 'test-owner')).toBe(true);
    expect(isUnmodifiedManagedAgentSkill(managed.replace('Example', 'Edited'), 'test-owner')).toBe(
      false,
    );
  });

  it('includes and updates prior managed copies in compatible skill directories', () => {
    const root = '/repo';
    const existingDirectories = [
      { path: '.cursor/skills', supportsAgentsSkills: true },
      { path: '.claude/skills', supportsAgentsSkills: false },
    ];
    const candidates = getManagedAgentSkillCandidatePaths(root, existingDirectories, MANAGED_SKILL);
    const snapshots = absentSnapshots(candidates);
    MANAGED_SKILL.files.forEach((file) => {
      const path = join(root, '.cursor', 'skills', MANAGED_SKILL.name, file.path);
      snapshots[path] = {
        kind: 'file',
        path,
        contents: buildManagedAgentSkill(
          `${file.contents.trimEnd()}\n\nPrior revision.\n`,
          'test-owner',
        ),
        mode: 0o100644,
      };
    });

    const plan = planManagedAgentSkill({
      rootDirectory: root,
      existingDirectories,
      snapshots,
      skill: MANAGED_SKILL,
    });

    expect(candidates).toContain(join(root, '.cursor', 'skills', MANAGED_SKILL.name, 'SKILL.md'));
    expect(
      plan.changes.filter(({ path }) => path.includes('.cursor/skills/example-skill')),
    ).toHaveLength(MANAGED_SKILL.files.length);
  });

  it('warns instead of replacing a customized prior managed copy', () => {
    const root = '/repo';
    const existingDirectories = [
      { path: '.cursor/skills', supportsAgentsSkills: true },
      { path: '.claude/skills', supportsAgentsSkills: false },
    ];
    const candidates = getManagedAgentSkillCandidatePaths(root, existingDirectories, MANAGED_SKILL);
    const snapshots = absentSnapshots(candidates);
    const skillPath = join(root, '.cursor', 'skills', MANAGED_SKILL.name, 'SKILL.md');
    snapshots[skillPath] = {
      kind: 'file',
      path: skillPath,
      contents: buildManagedAgentSkill('# Example\n', 'test-owner').replace(
        'Example',
        'Customized',
      ),
      mode: 0o100644,
    };

    const plan = planManagedAgentSkill({
      rootDirectory: root,
      existingDirectories,
      snapshots,
      skill: MANAGED_SKILL,
    });

    expect(plan.unchanged).toContain(skillPath);
    expect(plan.warnings).toContain(
      `Existing customized managed skill was left unchanged: ${join(
        root,
        '.cursor',
        'skills',
        MANAGED_SKILL.name,
      )}`,
    );
    expect(plan.changes.some(({ path }) => path === skillPath)).toBe(false);
  });
});

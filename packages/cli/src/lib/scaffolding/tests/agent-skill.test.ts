import { describe, expect, it } from 'vitest';

import {
  AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES,
  buildManagedAgentSkill,
  isUnmodifiedManagedAgentSkill,
  PROJECT_SKILL_DIRECTORIES,
  resolveAgentSkillDirectories,
} from '../agent-skill.js';

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
});

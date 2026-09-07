import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import {
  AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES,
  applySetupFeatureOverrides,
  mergeDenoConfiguration,
  mergeEditorExtensions,
  mergeEditorSettings,
  mergeJsonc,
  PROJECT_SKILL_DIRECTORIES,
  resolveSetupFeatures,
} from '../scaffold-config.js';
import { CustomFunctionSetupFeature } from '../scaffold-model.js';

describe('project skill directory registry', () => {
  it('matches the pinned vercel-labs/skills project paths', () => {
    expect(PROJECT_SKILL_DIRECTORIES).toEqual([
      '.aider-desk/skills',
      '.agents/skills',
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
    ]);
    expect(AGENTS_SKILLS_COMPATIBLE_PROJECT_DIRECTORIES).toContain('.cursor/skills');
  });
});

describe('setup feature resolution', () => {
  it('applies explicit overrides in stable feature order', () => {
    const recommended = resolveSetupFeatures('recommended', {
      hasProjectSkillDirectory: true,
    });

    expect(
      applySetupFeatureOverrides(recommended, {
        [CustomFunctionSetupFeature.Deno]: false,
        [CustomFunctionSetupFeature.Ci]: true,
      }),
    ).toEqual([CustomFunctionSetupFeature.Skill, CustomFunctionSetupFeature.Ci]);
  });
});

describe('JSONC configuration merging', () => {
  it('preserves comments and is a no-op when rerun', () => {
    const existing = `{
  // Keep the project-specific compiler setting.
  "compilerOptions": {
    "noImplicitOverride": true
  },
  /* Keep this custom task. */
  "tasks": {
    "custom": "deno task custom"
  }
}
`;

    const merged = mergeDenoConfiguration(existing, '1.2.3');
    const rerun = mergeDenoConfiguration(merged, '1.2.3');

    expect(merged.match(/\/\/ Keep the project-specific compiler setting\./gu)).toHaveLength(1);
    expect(merged.match(/\/\* Keep this custom task\. \*\//gu)).toHaveLength(1);
    expect(parse(merged)).toMatchObject({
      imports: {
        '@transcend-io/custom-function-types': 'npm:@transcend-io/custom-function-types@1.2.3',
      },
      compilerOptions: {
        noImplicitOverride: true,
        strict: true,
      },
      tasks: {
        custom: 'deno task custom',
        'custom-functions:check':
          'deno check functions/**/*.ts && deno lint functions/ && deno fmt --check functions/ test-payloads/',
      },
    });
    expect(rerun).toBe(merged);
  });

  it('refuses to replace a conflicting Custom Function task', () => {
    expect(() =>
      mergeDenoConfiguration(
        '{"tasks":{"custom-functions:check":"deno task something-else"}}\n',
        '1.2.3',
      ),
    ).toThrow(
      'Deno task "custom-functions:check" already has a different command; apply the patch manually.',
    );
  });

  it('requires a manual patch when a trailing property comment cannot be preserved safely', () => {
    const existing = `{
  "strict": false // Explain why this is currently disabled.
}
`;

    expect(() =>
      mergeJsonc(existing, [{ path: ['additional'], value: true }], 'test configuration'),
    ).toThrow(
      'Cannot prove comment-preserving edits for test configuration; apply the displayed patch manually.',
    );
  });

  it('requires a manual patch for invalid JSONC instead of rewriting it', () => {
    expect(() => mergeDenoConfiguration('{\n  "compilerOptions":,\n}\n', '1.2.3')).toThrow(
      'Cannot safely merge Deno configuration; fix its JSONC syntax or apply the patch manually.',
    );
  });

  it('merges editor support without disturbing unrelated settings', () => {
    const settings = mergeEditorSettings(
      `{
  // Keep the repository formatter.
  "editor.defaultFormatter": "example.formatter"
}
`,
      '/repo',
      '/repo/packages/functions',
    );
    const extensions = mergeEditorExtensions('{"recommendations":["example.extension"]}\n');

    expect(settings).toContain('// Keep the repository formatter.');
    expect(parse(settings)).toEqual({
      'editor.defaultFormatter': 'example.formatter',
      'deno.enable': true,
      'deno.enablePaths': ['packages/functions'],
    });
    expect(parse(extensions)).toEqual({
      recommendations: ['example.extension', 'denoland.vscode-deno'],
    });
  });
});

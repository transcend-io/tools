import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  CUSTOM_FUNCTION_SETUP_REFERENCE_MD,
  CUSTOM_FUNCTION_SKILL_FILES,
  CUSTOM_FUNCTION_SKILL_MD,
  CUSTOM_FUNCTION_SKILL_NAME,
  CUSTOM_FUNCTION_WRITING_REFERENCE_MD,
} from '../custom-function-skill.js';

describe('Custom Function Agent Skill', () => {
  it('conforms to the portable Agent Skills frontmatter contract', () => {
    const frontmatter = CUSTOM_FUNCTION_SKILL_MD.match(/^---\n([\s\S]*?)\n---\n/u);
    expect(frontmatter).not.toBeNull();
    const metadata = parse(frontmatter![1]!) as Record<string, unknown>;

    expect(Object.keys(metadata).sort()).toEqual(['compatibility', 'description', 'name']);
    expect(metadata.name).toBe(CUSTOM_FUNCTION_SKILL_NAME);
    expect(metadata.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    expect((metadata.name as string).length).toBeLessThanOrEqual(64);
    expect(typeof metadata.description).toBe('string');
    expect((metadata.description as string).length).toBeGreaterThan(0);
    expect((metadata.description as string).length).toBeLessThanOrEqual(1024);
    expect((metadata.compatibility as string).length).toBeLessThanOrEqual(500);
    expect(CUSTOM_FUNCTION_SKILL_MD.slice(frontmatter![0].length).trim().length).toBeGreaterThan(0);
    expect(CUSTOM_FUNCTION_SKILL_MD.split('\n').length).toBeLessThanOrEqual(500);
  });

  it('uses one-level progressive disclosure for setup and implementation', () => {
    expect(CUSTOM_FUNCTION_SKILL_FILES.map(({ path }) => path)).toEqual([
      'SKILL.md',
      'references/setup.md',
      'references/writing-custom-functions.md',
    ]);
    expect(CUSTOM_FUNCTION_SKILL_MD).toContain('[references/setup.md](references/setup.md)');
    expect(CUSTOM_FUNCTION_SKILL_MD).toContain(
      '[references/writing-custom-functions.md](references/writing-custom-functions.md)',
    );
  });

  it('keeps setup and CI guidance in its focused reference', () => {
    expect(CUSTOM_FUNCTION_SETUP_REFERENCE_MD).toContain('transcend custom-functions init');
    expect(CUSTOM_FUNCTION_SETUP_REFERENCE_MD).toContain('Deno 2');
    expect(CUSTOM_FUNCTION_SETUP_REFERENCE_MD).toContain('--noInteractive');
    expect(CUSTOM_FUNCTION_SETUP_REFERENCE_MD).toContain('Do not add deployment credentials');
  });

  it('covers safe authoring, validation, and deployment in its focused reference', () => {
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('CustomFunction.GeneralArgument');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('CustomFunction.Argument');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('CustomFunction.EnricherArgument');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain(
      '`payload`, `environment`, `sdk`, and `kv`',
    );
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('response.ok');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('<<parameters.name>>');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('allowed-hosts');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('--dryRun');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('--promote=false');
    expect(CUSTOM_FUNCTION_WRITING_REFERENCE_MD).toContain('--updateManifest');
  });
});

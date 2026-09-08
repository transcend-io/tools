import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  POLICY_AUTHORING_REFERENCE_MD,
  POLICY_PUBLISHING_REFERENCE_MD,
  POLICY_SETUP_TOOLING_REFERENCE_MD,
  POLICY_SKILL_FILES,
  POLICY_SKILL_MD,
  POLICY_SKILL_NAME,
  POLICY_TESTING_DEBUGGING_REFERENCE_MD,
} from '../policy-skill.js';

describe('Policy Engine Agent Skill', () => {
  it('conforms to the portable Agent Skills frontmatter contract', () => {
    const frontmatter = POLICY_SKILL_MD.match(/^---\n([\s\S]*?)\n---\n/u);
    expect(frontmatter).not.toBeNull();
    const metadata = parse(frontmatter![1]!) as Record<string, unknown>;

    expect(Object.keys(metadata).sort()).toEqual(['compatibility', 'description', 'name']);
    expect(metadata.name).toBe(POLICY_SKILL_NAME);
    expect(metadata.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    expect((metadata.name as string).length).toBeLessThanOrEqual(64);
    expect(typeof metadata.description).toBe('string');
    expect((metadata.description as string).length).toBeGreaterThan(0);
    expect((metadata.description as string).length).toBeLessThanOrEqual(1024);
    expect((metadata.compatibility as string).length).toBeLessThanOrEqual(500);
    expect(POLICY_SKILL_MD.slice(frontmatter![0].length).trim().length).toBeGreaterThan(0);
    expect(POLICY_SKILL_MD.split('\n').length).toBeLessThanOrEqual(500);
  });

  it('bundles one canonical skill with progressive references', () => {
    expect(POLICY_SKILL_FILES.map(({ path }) => path)).toEqual([
      'SKILL.md',
      'references/setup-tooling.md',
      'references/authoring.md',
      'references/testing-debugging.md',
      'references/publishing.md',
    ]);
    POLICY_SKILL_FILES.slice(1).forEach(({ path }) => {
      expect(POLICY_SKILL_MD).toContain(`[${path}](${path})`);
    });
    expect(POLICY_SKILL_MD).toContain('transcend <command> --help');
    expect(POLICY_SKILL_MD).toContain(
      'https://github.com/transcend-io/tools/tree/main/packages/cli#readme',
    );
    expect(POLICY_SKILL_MD).toContain('https://docs.transcend.io/llms.txt');
  });

  it('teaches verified setup and read-only CI without invented deployment behavior', () => {
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).toContain('transcend policy init --help');
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).toContain('--editor');
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).toContain('--skill');
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).toContain('--ci');
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).toContain('OPA 1.13.1');
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).toContain('Regal 0.42.0');
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).toContain('read-only and credential-free');
    expect(POLICY_SETUP_TOOLING_REFERENCE_MD).not.toContain('policy publish');
  });

  it('teaches OPA document trees, Rego v1, and one fail-closed result constructor', () => {
    expect(POLICY_AUTHORING_REFERENCE_MD).toContain(
      'OPA evaluates queries against one document tree',
    );
    expect(POLICY_AUTHORING_REFERENCE_MD).toContain('import rego.v1');
    expect(POLICY_AUTHORING_REFERENCE_MD).toContain('default decision := "deny"');
    expect(POLICY_AUTHORING_REFERENCE_MD).toContain('"reason_code": reason_code');
    expect(POLICY_AUTHORING_REFERENCE_MD.match(/^result :=/gmu)).toHaveLength(1);
    expect(POLICY_AUTHORING_REFERENCE_MD).toContain('manifest.json');
    expect(POLICY_AUTHORING_REFERENCE_MD).toContain('Fail closed');
  });

  it('covers tests, debugging, manifest coverage, lint, fix, and publish flow', () => {
    expect(POLICY_TESTING_DEBUGGING_REFERENCE_MD).toContain('_test.rego');
    expect(POLICY_TESTING_DEBUGGING_REFERENCE_MD).toContain('opa test --fail-on-empty');
    expect(POLICY_TESTING_DEBUGGING_REFERENCE_MD).toContain('opa check --strict --v0-compatible');
    expect(POLICY_TESTING_DEBUGGING_REFERENCE_MD).toContain('transcend policy lint');
    expect(POLICY_TESTING_DEBUGGING_REFERENCE_MD).toContain('--fix');
    expect(POLICY_TESTING_DEBUGGING_REFERENCE_MD).toContain('input.example.json');
    expect(POLICY_TESTING_DEBUGGING_REFERENCE_MD).toContain('input.json');
    expect(POLICY_PUBLISHING_REFERENCE_MD).toContain('manifest.json');
    expect(POLICY_PUBLISHING_REFERENCE_MD).toContain('transcend policy lint');
    expect(POLICY_PUBLISHING_REFERENCE_MD).toContain('transcend policy publish --help');
  });

  it('contains no duplicate agent files or product-specific runtime assumptions', () => {
    const allContents = POLICY_SKILL_FILES.map(({ contents }) => contents).join('\n');
    expect(POLICY_SKILL_FILES.map(({ path }) => path)).not.toContain('AGENTS.md');
    expect(POLICY_SKILL_FILES.map(({ path }) => path)).not.toContain('CLAUDE.md');
    expect(allContents).not.toMatch(/myelin|runtime\/|TRANSCEND_API_KEY=/iu);
    expect(allContents).toContain('Do not invent an input shape');
  });
});

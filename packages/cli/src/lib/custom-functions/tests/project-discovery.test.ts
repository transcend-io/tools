import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../tests/helpers/buildContextForTest.js';
import { resolveCliPath } from '../paths.js';
import {
  discoverCustomFunctionManifests,
  discoverCustomFunctionProject,
} from '../project-discovery.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-discovery-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('resolveCliPath', () => {
  it('resolves relative paths against the supplied working directory', () => {
    expect(resolveCliPath('/repo/packages', '../custom-functions')).toBe('/repo/custom-functions');
    expect(resolveCliPath('/repo/packages', '/tmp/project/../functions')).toBe('/tmp/functions');
  });
});

describe('discoverCustomFunctionProject', () => {
  it('defaults to an isolated transcend/custom-functions directory', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({ cwd: root, env: { HOME: root } });

    const state = await discoverCustomFunctionProject(context, {});

    expect(state.targetDirectory).toBe(join(root, 'transcend', 'custom-functions'));
    expect(state.manifestDirectory).toBe(state.targetDirectory);
    expect(state.manifestPath).toBe(
      join(root, 'transcend', 'custom-functions', 'transcend-functions.yml'),
    );
  });

  it('uses an explicit manifest directory as the implicit target', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({ cwd: root, env: { HOME: root } });

    const state = await discoverCustomFunctionProject(context, {
      manifest: './config/functions.yml',
    });

    expect(state.targetDirectory).toBe(join(root, 'config'));
    expect(state.manifestDirectory).toBe(join(root, 'config'));
    expect(state.manifestPath).toBe(join(root, 'config', 'functions.yml'));
  });

  it('discovers repository and project skill state without consulting home directories', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'custom-functions');
    const isolatedHome = join(root, 'home');
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(join(root, '.agents', 'skills'), { recursive: true });
    mkdirSync(join(root, '.cursor', 'skills'), { recursive: true });
    mkdirSync(join(root, '.claude', 'skills'), { recursive: true });
    mkdirSync(join(root, '.custom-agent', 'skills', 'existing'), { recursive: true });
    mkdirSync(join(target, 'Functions'), { recursive: true });
    mkdirSync(join(target, 'node_modules', 'ignored'), { recursive: true });
    mkdirSync(join(isolatedHome, '.windsurf', 'skills'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = git@github.com:transcend-io/tools.git\n',
    );
    writeFileSync(
      join(root, '.custom-agent', 'skills', 'existing', 'SKILL.md'),
      '---\nname: existing\ndescription: Existing skill\n---\n',
    );
    writeFileSync(join(target, 'deno.jsonc'), '{}\n');
    writeFileSync(join(target, 'Functions', 'Existing.ts'), 'export default 1;\n');
    writeFileSync(join(target, 'node_modules', 'ignored', 'package.json'), '{}\n');
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: isolatedHome },
    });

    const first = await discoverCustomFunctionProject(context, {
      directory: 'custom-functions',
    });
    const second = await discoverCustomFunctionProject(context, {
      directory: 'custom-functions',
    });

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      targetDirectory: target,
      manifestDirectory: target,
      manifestPath: join(target, 'transcend-functions.yml'),
      repositoryRoot: root,
      denoConfigPath: join(target, 'deno.jsonc'),
      usesGithub: true,
    });
    expect(first.existingSkillDirectories).toEqual(
      expect.arrayContaining([
        { path: '.agents/skills', supportsAgentsSkills: true },
        { path: '.cursor/skills', supportsAgentsSkills: true },
        { path: '.claude/skills', supportsAgentsSkills: false },
        { path: '.custom-agent/skills', supportsAgentsSkills: false },
      ]),
    );
    expect(first.existingSkillDirectories).toHaveLength(4);
    expect(first.existingSkillDirectories.some(({ path }) => path.includes('windsurf'))).toBe(
      false,
    );
    expect(first.relativePaths).toContain('Functions/Existing.ts');
    expect(first.relativePaths.some((path) => path.includes('node_modules'))).toBe(false);
  });
});

describe('discoverCustomFunctionManifests', () => {
  it('recognizes valid manifests with custom YAML filenames', () => {
    const root = makeTemporaryRoot();
    mkdirSync(join(root, '.git'));
    writeFileSync(join(root, 'functions.yml'), 'functions: []\n');
    writeFileSync(join(root, 'workflow.yml'), 'jobs: {}\n');
    const context = buildContextForTest({ cwd: root });

    expect(discoverCustomFunctionManifests(context, root)).toEqual([join(root, 'functions.yml')]);
  });
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import {
  discoverCustomFunctionProject,
  readProjectFileSnapshot,
  resolveCliPath,
} from '../discovery.js';

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

describe('readProjectFileSnapshot', () => {
  it('reads regular files and rejects directories through the context filesystem', () => {
    const root = makeTemporaryRoot();
    const file = join(root, 'deno.json');
    writeFileSync(file, '{}\n', { mode: 0o640 });
    const context = buildContextForTest({ cwd: root });

    expect(readProjectFileSnapshot(context, file)).toMatchObject({
      path: file,
      contents: '{}\n',
    });
    expect(readProjectFileSnapshot(context, join(root, 'missing.json'))).toEqual({
      path: join(root, 'missing.json'),
      contents: null,
    });
    expect(() => readProjectFileSnapshot(context, root)).toThrow(
      `Expected a regular file: ${root}`,
    );
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

  it('discovers repository, Deno, GitHub, agent, and collision state deterministically', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'custom-functions');
    const isolatedHome = join(root, 'home');
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(join(root, '.cursor'), { recursive: true });
    mkdirSync(join(root, '.cline'), { recursive: true });
    mkdirSync(join(root, '.agents', 'skills'), { recursive: true });
    mkdirSync(join(target, 'Functions'), { recursive: true });
    mkdirSync(join(target, 'node_modules', 'ignored'), { recursive: true });
    mkdirSync(isolatedHome, { recursive: true });
    writeFileSync(
      join(root, '.git', 'config'),
      '[remote "origin"]\n  url = git@github.com:transcend-io/tools.git\n',
    );
    writeFileSync(join(root, 'package.json'), '{"packageManager":"pnpm@10.34.4"}\n');
    writeFileSync(join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
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
      packageJsonPath: join(root, 'package.json'),
      packageManager: { name: 'pnpm', agent: 'pnpm' },
      pnpmWorkspaceRoot: true,
      existingSkillDirectories: ['.agents/skills'],
      usesGithub: true,
    });
    expect(first.detectedAgents.map(({ id }) => id)).toEqual(['universal', 'cline']);
    expect(first.relativePaths).toContain('Functions/Existing.ts');
    expect(first.relativePaths.some((path) => path.includes('node_modules'))).toBe(false);
  });
});

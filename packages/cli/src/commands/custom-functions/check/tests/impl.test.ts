import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { check } from '../impl.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-check-command-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('custom-functions check', () => {
  it('uses the manifest directory when only --manifest is provided', async () => {
    const root = makeTemporaryRoot();
    const manifestPath = join(root, 'custom.yml');
    writeFileSync(manifestPath, 'functions: []\n');
    const context = buildContextForTest({
      cwd: root,
      env: { PATH: '' },
      stdinIsTTY: false,
    });

    await check.call(
      context,
      {
        manifest: 'custom.yml',
        variables: '',
        fix: false,
        noInteractive: true,
        json: true,
      },
      'transcend/custom-functions',
    );

    expect(JSON.parse(context.stdout)).toMatchObject({ manifestPath });
  });

  it('defaults to transcend/custom-functions', async () => {
    const root = makeTemporaryRoot();
    const directory = join(root, 'transcend', 'custom-functions');
    const manifestPath = join(directory, 'transcend-functions.yml');
    mkdirSync(directory, { recursive: true });
    writeFileSync(manifestPath, 'functions: []\n');
    const context = buildContextForTest({
      cwd: root,
      env: { PATH: '' },
      stdinIsTTY: false,
    });

    await check.call(context, {
      variables: '',
      fix: false,
      noInteractive: true,
      json: true,
    });

    const result = JSON.parse(context.stdout);
    expect(result.manifestPath).toBe(manifestPath);
    expect(result.checks).toContainEqual({ name: 'manifest', status: 'passed' });
  });

  it('suggests the only discovered manifest when the default is missing', async () => {
    const root = makeTemporaryRoot();
    const discoveredDirectory = join(root, 'packages', 'privacy-functions');
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(discoveredDirectory, { recursive: true });
    writeFileSync(join(discoveredDirectory, 'transcend-functions.yml'), 'functions: []\n');
    const context = buildContextForTest({
      cwd: root,
      env: { PATH: '' },
      stdinIsTTY: false,
    });

    await check.call(context, {
      variables: '',
      fix: false,
      noInteractive: true,
      json: true,
    });

    expect(JSON.parse(context.stdout).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'manifest.missing',
        message:
          'Custom Function manifest does not exist at transcend/custom-functions/transcend-functions.yml. ' +
          "Did you mean `transcend custom-functions check 'packages/privacy-functions'`?",
      }),
    );
  });

  it('lists discovered manifests when the default is ambiguous', async () => {
    const root = makeTemporaryRoot();
    mkdirSync(join(root, '.git'), { recursive: true });
    ['first', 'second'].forEach((directory) => {
      mkdirSync(join(root, directory), { recursive: true });
      writeFileSync(join(root, directory, 'transcend-functions.yml'), 'functions: []\n');
    });
    const context = buildContextForTest({
      cwd: root,
      env: { PATH: '' },
      stdinIsTTY: false,
    });

    await check.call(context, {
      variables: '',
      fix: false,
      noInteractive: true,
      json: true,
    });

    expect(JSON.parse(context.stdout).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'manifest.missing',
        message: expect.stringContaining(
          'Found manifests at: first/transcend-functions.yml, second/transcend-functions.yml.',
        ),
      }),
    );
  });

  it('suggests init when no manifest exists', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      env: { PATH: '' },
      stdinIsTTY: false,
    });

    await check.call(context, {
      variables: '',
      fix: false,
      noInteractive: true,
      json: true,
    });

    expect(JSON.parse(context.stdout).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'manifest.missing',
        message: expect.stringContaining('`transcend custom-functions init`'),
      }),
    );
  });

  it('emits one stable JSON result while keeping diagnostics off stderr', async () => {
    const root = makeTemporaryRoot();
    const manifestPath = join(root, 'transcend-functions.yml');
    writeFileSync(
      manifestPath,
      `functions:
  - name: Example
    code: ./function.ts
    test-payload: ./payload.json
`,
    );
    writeFileSync(join(root, 'function.ts'), 'export default () => {};\n');
    writeFileSync(join(root, 'payload.json'), '{"event":"example"}\n');
    const context = buildContextForTest({
      cwd: root,
      env: { PATH: '' },
      stdinIsTTY: false,
    });
    const flags = {
      variables: '',
      fix: false,
      noInteractive: true,
      json: true,
    };

    await check.call(context, flags, root);
    const first = context.stdout;
    const parsed = JSON.parse(first);

    expect(parsed).toMatchObject({
      version: 1,
      status: 'failed',
      manifestPath,
      checks: [
        { name: 'manifest', status: 'passed' },
        { name: 'files', status: 'passed' },
        { name: 'payloads', status: 'passed' },
        { name: 'runtime', status: 'failed' },
        { name: 'exports', status: 'skipped' },
        { name: 'typecheck', status: 'skipped' },
        { name: 'lint', status: 'skipped' },
        { name: 'format', status: 'skipped' },
      ],
      diagnostics: [{ code: 'deno.missing', severity: 'error' }],
    });
    expect(first.trim().split('\n')).toHaveLength(1);
    expect(context.stderr).toBe('');
    expect(context.process.exitCode).toBe(1);

    context.reset();
    await check.call(context, flags, root);
    expect(context.stdout).toBe(first);
    expect(context.stderr).toBe('');
  });
});

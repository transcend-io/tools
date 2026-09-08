import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { init, type CustomFunctionInitFlags } from '../impl.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-init-'));
  temporaryRoots.push(root);
  return root;
}

/**
 * Build non-interactive init flags.
 *
 * @param overrides - Flag values to replace
 * @returns Complete init flags
 */
function buildFlags(overrides: Partial<CustomFunctionInitFlags> = {}): CustomFunctionInitFlags {
  return {
    noInteractive: true,
    dryRun: false,
    yes: true,
    json: true,
    ...overrides,
  };
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('custom-functions init', () => {
  it('uses transcend/custom-functions when no directory is provided', async () => {
    const root = makeTemporaryRoot();
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: root },
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags());

    const target = join(root, 'transcend', 'custom-functions');
    expect(readFileSync(join(target, 'transcend-functions.yml'), 'utf8')).toBe(
      '# Custom Functions managed as code.\nfunctions: []\n',
    );
    expect(JSON.parse(context.stdout)).toMatchObject({
      targetDirectory: target,
      manifestPath: join(target, 'transcend-functions.yml'),
    });
  });

  it('places repository-level setup at the invocation root for a bare default project', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'transcend', 'custom-functions');
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: root },
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ editor: true, skill: true }));

    expect(existsSync(join(root, '.vscode', 'settings.json'))).toBe(true);
    expect(
      existsSync(join(root, '.agents', 'skills', 'transcend-custom-functions', 'SKILL.md')),
    ).toBe(true);
    expect(existsSync(join(target, '.vscode'))).toBe(false);
    expect(existsSync(join(target, '.agents'))).toBe(false);
  });

  it('previews an empty target without writing anything', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: root },
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ dryRun: true, yes: false }), target);

    expect(existsSync(target)).toBe(false);
    expect(JSON.parse(context.stdout)).toMatchObject({
      version: 1,
      command: 'init',
      applied: false,
      dryRun: true,
      targetDirectory: target,
      manifestPath: join(target, 'transcend-functions.yml'),
      changes: [
        {
          kind: 'create',
          target: 'project/transcend-functions.yml',
        },
      ],
    });
    expect(context.stderr).toBe('');
  });

  it('applies only explicitly enabled setup flags without prompts', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: root },
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ deno: true }), target);

    expect(existsSync(join(target, 'deno.json'))).toBe(true);
    expect(existsSync(join(target, '.vscode'))).toBe(false);
    expect(existsSync(join(target, '.agents', 'skills'))).toBe(false);
    expect(existsSync(join(target, '.github', 'workflows'))).toBe(false);
  });

  it('prints a compact AI handoff after interactive-format output', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: root },
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags({ json: false }), target);

    const lines = context.stdout.split('\n');
    const handoffHeading = lines.indexOf('AI handoff — paste into your coding agent');
    expect(handoffHeading).toBeGreaterThan(-1);
    expect(lines[handoffHeading + 1]).toMatch(/^(?:Ask|Use) /u);
    expect(context.stdout).toContain('add equivalent CI for this repository');
    expect(context.stdout).toContain('install Deno 2.x');
  });

  it('applies initialization once and reports a no-op on rerun', async () => {
    const root = makeTemporaryRoot();
    const target = join(root, 'project');
    const manifestPath = join(target, 'transcend-functions.yml');
    const context = buildContextForTest({
      cwd: root,
      env: { HOME: root },
      stdinIsTTY: false,
    });

    await init.call(context, buildFlags(), target);

    expect(JSON.parse(context.stdout)).toMatchObject({
      command: 'init',
      applied: true,
      dryRun: false,
      aiHandoff: expect.stringContaining('coding agent'),
    });
    expect(readFileSync(manifestPath, 'utf8')).toBe(
      '# Custom Functions managed as code.\nfunctions: []\n',
    );

    context.reset();
    await init.call(context, buildFlags(), target);

    expect(JSON.parse(context.stdout)).toMatchObject({
      command: 'init',
      applied: false,
      dryRun: false,
      changes: [],
    });
    expect(readFileSync(manifestPath, 'utf8')).toBe(
      '# Custom Functions managed as code.\nfunctions: []\n',
    );
  });
});

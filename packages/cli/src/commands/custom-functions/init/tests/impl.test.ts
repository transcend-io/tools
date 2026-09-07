import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import type { CustomFunctionScaffoldFlags } from '../../shared/scaffold.js';
import { init } from '../impl.js';

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
function buildFlags(
  overrides: Partial<CustomFunctionScaffoldFlags> = {},
): CustomFunctionScaffoldFlags {
  return {
    setup: 'none',
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

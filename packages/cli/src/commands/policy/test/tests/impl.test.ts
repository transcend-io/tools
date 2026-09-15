import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { test } from '../impl.js';

const assertOpaInstalledMock = vi.hoisted(() => vi.fn());
const runOpaMock = vi.hoisted(() => vi.fn().mockResolvedValue(0));

vi.mock('../../helpers/index.js', () => ({
  assertOpaInstalled: assertOpaInstalledMock,
  runOpa: runOpaMock,
}));

const temporaryDirectories: string[] = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('policy test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tests every child with a .manifest under the workspace', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'policy-test-workspace-'));
    temporaryDirectories.push(workspace);
    for (const name of ['example-bundle', 'payments'] as const) {
      const bundle = join(workspace, name);
      mkdirSync(bundle);
      writeFileSync(join(bundle, '.manifest'), JSON.stringify({ roots: ['x'] }));
    }
    const context = buildContextForTest({ cwd: tmpdir() });

    await test.call(context, {}, workspace);

    expect(assertOpaInstalledMock).toHaveBeenCalledOnce();
    expect(runOpaMock).toHaveBeenCalledTimes(2);
    expect(runOpaMock).toHaveBeenNthCalledWith(1, [
      'test',
      '--fail-on-empty',
      '-b',
      join(workspace, 'example-bundle'),
    ]);
    expect(runOpaMock).toHaveBeenNthCalledWith(2, [
      'test',
      '--fail-on-empty',
      '-b',
      join(workspace, 'payments'),
    ]);
  });

  it('resolves a single bundle directory from the invocation directory', async () => {
    const bundle = mkdtempSync(join(tmpdir(), 'policy-test-bundle-'));
    temporaryDirectories.push(bundle);
    writeFileSync(join(bundle, '.manifest'), JSON.stringify({ roots: ['x'] }));
    const context = buildContextForTest({ cwd: tmpdir() });

    await test.call(context, {}, bundle);

    expect(runOpaMock).toHaveBeenCalledWith(['test', '--fail-on-empty', '-b', bundle]);
  });
});

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

    await test.call(
      context,
      {
        format: 'pretty',
        verbose: false,
        coverage: false,
        'var-values': false,
        'exit-zero-on-skipped': false,
      },
      workspace,
    );

    expect(assertOpaInstalledMock).toHaveBeenCalledOnce();
    expect(runOpaMock).toHaveBeenCalledTimes(2);
    expect(runOpaMock).toHaveBeenNthCalledWith(1, [
      'test',
      '--fail-on-empty',
      '-b',
      join(workspace, 'example-bundle'),
      '--format',
      'pretty',
    ]);
    expect(runOpaMock).toHaveBeenNthCalledWith(2, [
      'test',
      '--fail-on-empty',
      '-b',
      join(workspace, 'payments'),
      '--format',
      'pretty',
    ]);
  });

  it('forwards curated opa test flags for a single bundle', async () => {
    const bundle = mkdtempSync(join(tmpdir(), 'policy-test-bundle-'));
    temporaryDirectories.push(bundle);
    writeFileSync(join(bundle, '.manifest'), JSON.stringify({ roots: ['x'] }));
    const schemas = mkdtempSync(join(tmpdir(), 'policy-test-schemas-'));
    temporaryDirectories.push(schemas);
    const context = buildContextForTest({ cwd: tmpdir() });

    await test.call(
      context,
      {
        format: 'json',
        verbose: true,
        run: 'test_allows',
        coverage: true,
        threshold: '80',
        timeout: '10s',
        'var-values': true,
        explain: 'full',
        schema: schemas,
        'exit-zero-on-skipped': true,
      },
      bundle,
    );

    expect(runOpaMock).toHaveBeenCalledWith([
      'test',
      '--fail-on-empty',
      '-b',
      bundle,
      '--format',
      'json',
      '--verbose',
      '--run',
      'test_allows',
      '--coverage',
      '--threshold',
      '80',
      '--timeout',
      '10s',
      '--var-values',
      '--explain',
      'full',
      '--schema',
      schemas,
      '--exit-zero-on-skipped',
    ]);
  });

  it('rejects --threshold without --coverage', async () => {
    const bundle = mkdtempSync(join(tmpdir(), 'policy-test-threshold-'));
    temporaryDirectories.push(bundle);
    writeFileSync(join(bundle, '.manifest'), JSON.stringify({ roots: ['x'] }));
    const context = buildContextForTest({ cwd: tmpdir() });

    await expect(
      test.call(
        context,
        {
          format: 'pretty',
          verbose: false,
          coverage: false,
          threshold: '80',
          'var-values': false,
          'exit-zero-on-skipped': false,
        },
        bundle,
      ),
    ).rejects.toThrow('--threshold requires --coverage.');
  });
});

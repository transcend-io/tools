import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  CapturedProcessResult,
  CapturedProcessRunner,
} from '../../../../lib/cli/run-captured-process.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { runCustomFunctionChecks } from '../helpers.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-check-'));
  temporaryRoots.push(root);
  return root;
}

/**
 * Write a minimal valid General Custom Function project.
 *
 * @param root - Project directory
 * @returns Paths used by the project
 */
function writeGeneralProject(root: string) {
  const manifestPath = join(root, 'transcend-functions.yml');
  const sourcePath = join(root, 'function.ts');
  const payloadPath = join(root, 'payload.json');
  writeFileSync(
    manifestPath,
    `functions:
  - name: Example
    code: ./function.ts
    test-payload: ./payload.json
`,
  );
  writeFileSync(sourcePath, 'export default () => {}\n');
  writeFileSync(payloadPath, '{"event":"example"}\n');
  return { manifestPath, sourcePath, payloadPath };
}

/**
 * Return a successful captured Deno result.
 *
 * @param overrides - Result values to replace
 * @returns Captured process result
 */
function processResult(overrides: Partial<CapturedProcessResult> = {}): CapturedProcessResult {
  return {
    code: 0,
    stdout: '',
    stderr: '',
    ...overrides,
  };
}

/**
 * Build a Deno-not-found result.
 *
 * @returns Captured process result
 */
function missingDenoResult(): CapturedProcessResult {
  const error = Object.assign(new Error('spawn deno ENOENT'), {
    code: 'ENOENT',
  }) as NodeJS.ErrnoException;
  return processResult({ code: 1, error });
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('runCustomFunctionChecks without Deno', () => {
  it('collects multiple payload diagnostics before reporting skipped Deno checks', async () => {
    const root = makeTemporaryRoot();
    const manifestPath = join(root, 'transcend-functions.yml');
    writeFileSync(
      manifestPath,
      `functions:
  - name: Broken payloads
    code: ./function.ts
    test-payloads:
      - payload: ./missing.json
      - payload: ./invalid.json
      - payload: ./schema.json
`,
    );
    writeFileSync(join(root, 'function.ts'), 'export default () => {};\n');
    writeFileSync(join(root, 'invalid.json'), '{\n');
    writeFileSync(join(root, 'schema.json'), '[]\n');
    const context = buildContextForTest({ cwd: root });
    const calls: string[][] = [];
    const runner: CapturedProcessRunner = (_command, args) => {
      calls.push([...args]);
      return Promise.resolve(missingDenoResult());
    };

    const result = await runCustomFunctionChecks(context, { manifestPath, fix: false }, runner);

    expect(calls).toEqual([['--version']]);
    expect(result.status).toBe('failed');
    expect(result.checks).toEqual([
      { name: 'manifest', status: 'passed' },
      { name: 'files', status: 'passed' },
      { name: 'payloads', status: 'failed' },
      { name: 'exports', status: 'skipped' },
      { name: 'typecheck', status: 'skipped' },
      { name: 'lint', status: 'skipped' },
      { name: 'format', status: 'skipped' },
    ]);
    expect(result.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'payload.missing',
        'payload.invalid-json',
        'payload.schema',
        'deno.missing',
      ]),
    );
  });

  it('retains manifest validation errors when Deno is missing', async () => {
    const root = makeTemporaryRoot();
    const manifestPath = join(root, 'transcend-functions.yml');
    writeFileSync(manifestPath, 'functions: invalid\n');
    const context = buildContextForTest({ cwd: root });
    const runner: CapturedProcessRunner = () => Promise.resolve(missingDenoResult());

    const result = await runCustomFunctionChecks(context, { manifestPath, fix: false }, runner);

    expect(result.checks).toContainEqual({ name: 'manifest', status: 'failed' });
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'manifest.invalid',
      'deno.missing',
    ]);
  });

  it('rejects Deno versions outside major version 2', async () => {
    const root = makeTemporaryRoot();
    const { manifestPath } = writeGeneralProject(root);
    const context = buildContextForTest({ cwd: root });
    const runner: CapturedProcessRunner = () =>
      Promise.resolve(processResult({ stdout: 'deno 1.46.3\n' }));

    const result = await runCustomFunctionChecks(context, { manifestPath, fix: false }, runner);

    expect(result.checks).toEqual(
      expect.arrayContaining([
        { name: 'exports', status: 'skipped' },
        { name: 'typecheck', status: 'skipped' },
        { name: 'lint', status: 'skipped' },
        { name: 'format', status: 'skipped' },
      ]),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'deno.unsupported-version',
        message: expect.stringContaining('Deno 2.x is required; found 1.46.3'),
      }),
    );
  });
});

describe('runCustomFunctionChecks with mocked Deno', () => {
  it('reports export, typecheck, lint, and format failures independently', async () => {
    const root = makeTemporaryRoot();
    const { manifestPath, sourcePath, payloadPath } = writeGeneralProject(root);
    const context = buildContextForTest({ cwd: root });
    const calls: string[][] = [];
    const runner: CapturedProcessRunner = (_command, args, options) => {
      calls.push([...args]);
      if (args[0] === '--version') {
        return Promise.resolve(processResult({ stdout: 'deno 2.5.6\n' }));
      }
      if (args[0] === 'doc') {
        return Promise.resolve(processResult({ stdout: '[]' }));
      }
      if (args[0] === 'check') {
        return Promise.resolve(processResult({ code: 1, stderr: 'type failure' }));
      }
      if (args[0] === 'lint') {
        return Promise.resolve(processResult({ code: 1, stderr: 'lint failure' }));
      }
      if (args[0] === 'fmt' && args.includes('--check')) {
        return Promise.resolve(processResult({ code: 1, stderr: 'format failure' }));
      }
      return Promise.resolve(processResult({ stdout: options.input ?? '' }));
    };

    const result = await runCustomFunctionChecks(context, { manifestPath, fix: false }, runner);

    expect(result.checks).toEqual([
      { name: 'manifest', status: 'passed' },
      { name: 'files', status: 'passed' },
      { name: 'payloads', status: 'passed' },
      { name: 'exports', status: 'failed' },
      { name: 'typecheck', status: 'failed' },
      { name: 'lint', status: 'failed' },
      { name: 'format', status: 'failed' },
    ]);
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'exports.default-missing',
      'deno.typecheck',
      'deno.lint',
      'deno.format',
    ]);
    expect(calls).toContainEqual(['doc', '--json', sourcePath]);
    expect(calls).toContainEqual(['check', '--no-config', sourcePath]);
    expect(calls).toContainEqual(['lint', '--no-config', sourcePath]);
    expect(calls).toContainEqual([
      'fmt',
      '--check',
      '--no-config',
      sourcePath,
      payloadPath,
      manifestPath,
    ]);
  });

  it.each([
    { label: '--fix', fix: true, useConfirmation: false },
    { label: 'confirmation', fix: false, useConfirmation: true },
  ])('repairs formatting with $label', async ({ fix, useConfirmation }) => {
    const root = makeTemporaryRoot();
    const { manifestPath } = writeGeneralProject(root);
    const context = buildContextForTest({ cwd: root });
    const calls: string[][] = [];
    const confirmFormat = vi.fn<(patch: string) => Promise<boolean>>(() => Promise.resolve(true));
    const runner: CapturedProcessRunner = (_command, args, options) => {
      calls.push([...args]);
      if (args[0] === '--version') {
        return Promise.resolve(processResult({ stdout: 'deno 2.5.6\n' }));
      }
      if (args[0] === 'doc') {
        return Promise.resolve(processResult({ stdout: '[{"name":"default"}]' }));
      }
      if (args[0] === 'fmt' && args.includes('--check')) {
        return Promise.resolve(processResult({ code: 1 }));
      }
      if (args[0] === 'fmt' && args.at(-1) === '-') {
        const input = options.input ?? '';
        return Promise.resolve(
          processResult({
            stdout: input.includes('export default') ? input.replace('{}\n', '{};\n') : input,
          }),
        );
      }
      return Promise.resolve(processResult());
    };

    const result = await runCustomFunctionChecks(
      context,
      {
        manifestPath,
        fix,
        ...(useConfirmation ? { confirmFormat } : {}),
      },
      runner,
    );

    expect(result.status).toBe('passed');
    expect(result.checks).toContainEqual({ name: 'format', status: 'passed' });
    expect(
      calls.some((args) => args[0] === 'fmt' && !args.includes('--check') && args.at(-1) !== '-'),
    ).toBe(true);
    if (useConfirmation) {
      expect(confirmFormat).toHaveBeenCalledOnce();
      expect(confirmFormat.mock.calls[0]![0]).toContain('Index: function.ts');
    } else {
      expect(confirmFormat).not.toHaveBeenCalled();
    }
  });

  it('reports unresolved source and payload path placeholders without reading them', async () => {
    const root = makeTemporaryRoot();
    const manifestPath = join(root, 'transcend-functions.yml');
    writeFileSync(
      manifestPath,
      `functions:
  - name: Placeholder paths
    code: ./functions/<<parameters.source>>.ts
    test-payload: ./payloads/<<parameters.payload>>.json
`,
    );
    const context = buildContextForTest({ cwd: root });
    const runner: CapturedProcessRunner = () => Promise.resolve(missingDenoResult());

    const result = await runCustomFunctionChecks(context, { manifestPath, fix: false }, runner);

    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'manifest.unresolved-code-path',
      'manifest.unresolved-payload-path',
      'deno.missing',
    ]);
    expect(result.checks).toContainEqual({ name: 'payloads', status: 'failed' });
  });
});

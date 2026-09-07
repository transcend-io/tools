import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

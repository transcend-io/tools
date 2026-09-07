import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run } from '@stricli/core';
import { afterEach, describe, expect, it } from 'vitest';

import { app } from '../../app.js';
import { buildContextForTest } from '../../lib/tests/helpers/buildContextForTest.js';

const temporaryRoots: string[] = [];

/**
 * Create and register an isolated temporary directory.
 *
 * @returns Temporary directory
 */
function makeTemporaryRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'custom-function-routes-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe('custom-functions routes', () => {
  it('registers init, new, and check in command help', async () => {
    const context = buildContextForTest({
      cwd: makeTemporaryRoot(),
      exitBehavior: 'record',
      stdinIsTTY: false,
    });

    await run(app, ['custom-functions', '--help'], context);

    const output = `${context.stdout}\n${context.stderr}`;
    expect(output).toContain('init');
    expect(output).toContain('Initialize a local Custom Function project');
    expect(output).toContain('new');
    expect(output).toContain('Scaffold one local Custom Function');
    expect(output).toContain('check');
    expect(output).toContain('Validate a local Custom Function project');
  });
});

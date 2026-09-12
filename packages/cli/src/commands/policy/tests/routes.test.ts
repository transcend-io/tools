import { run } from '@stricli/core';
import { describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import { buildContextForTest } from '../../../lib/tests/helpers/buildContextForTest.js';

describe('policy routes', () => {
  it('registers policy init with its literal default path and repository setup flags', async () => {
    const context = buildContextForTest({
      exitBehavior: 'record',
      stdinIsTTY: false,
    });

    await run(app, ['policy', 'init', '--help'], context);

    const output = `${context.stdout}\n${context.stderr}`;
    expect(output).toContain('creates a publishable fail-closed Rego v1 starter');
    expect(output).toContain('transcend/policy');
    expect(output).toContain('--dryRun');
    expect(output).toContain('--yes');
    expect(output).toContain('--json');
    expect(output).toContain('--noInteractive');
    expect(output).toContain('--editor');
    expect(output).toContain('--skill');
    expect(output).toContain('--ci');
    expect(output).not.toContain('--preset');
  });

  it('documents policy lint as the verification gate with its literal default path', async () => {
    const context = buildContextForTest({
      exitBehavior: 'record',
      stdinIsTTY: false,
    });

    await run(app, ['policy', 'lint', '--help'], context);

    const output = `${context.stdout}\n${context.stderr}`;
    expect(output).toContain('Validates manifest roots and package coverage');
    expect(output).toContain('[directory]');
    expect(output).toContain('transcend/policy');
    expect(output).toContain('--fix');
    expect(output).toContain('--noInteractive');
    expect(output).toContain('--json');
    expect(output).not.toContain('--dir');
  });

  it.each(['test', 'eval', 'publish'])(
    'uses the shared positional default project for policy %s',
    async (command) => {
      const context = buildContextForTest({
        exitBehavior: 'record',
        stdinIsTTY: false,
      });

      await run(app, ['policy', command, '--help'], context);

      const output = `${context.stdout}\n${context.stderr}`;
      expect(output).toContain('[directory]');
      expect(output).toContain('transcend/policy');
      expect(output).not.toContain('--dir');
      expect(output).not.toMatch(/--bundle(?:\s|=)/u);
    },
  );

  it.each(['activate', 'bundles', 'deactivate', 'download', 'publish', 'versions'])(
    'preserves the released backend URL flag for policy %s',
    async (command) => {
      const context = buildContextForTest({ exitBehavior: 'record' });

      await run(app, ['policy', command, '--help'], context);

      const output = `${context.stdout}\n${context.stderr}`;
      expect(output).toContain('--transcend-url');
      expect(output).toContain('so --transcend-url may be omitted');
      expect(output).not.toContain('so --transcendUrl may be omitted');
    },
  );

  it.each(['activate', 'deactivate', 'download', 'publish', 'versions'])(
    'preserves the released bundle name flag for policy %s',
    async (command) => {
      const context = buildContextForTest({ exitBehavior: 'record' });

      await run(app, ['policy', command, '--help'], context);

      const output = `${context.stdout}\n${context.stderr}`;
      expect(output).toContain('--bundle-name');
    },
  );
});

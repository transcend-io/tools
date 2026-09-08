import { run } from '@stricli/core';
import { describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import { buildContextForTest } from '../../../lib/tests/helpers/buildContextForTest.js';

describe('policy routes', () => {
  it('documents policy lint as the verification gate with its literal default path', async () => {
    const context = buildContextForTest({
      exitBehavior: 'record',
      stdinIsTTY: false,
    });

    await run(app, ['policy', 'lint', '--help'], context);

    const output = `${context.stdout}\n${context.stderr}`;
    expect(output).toContain('Validates manifest roots and package coverage');
    expect(output).toContain('--dir');
    expect(output).toContain('transcend/policy');
    expect(output).toContain('--fix');
    expect(output).toContain('--noInteractive');
    expect(output).toContain('--json');
  });
});

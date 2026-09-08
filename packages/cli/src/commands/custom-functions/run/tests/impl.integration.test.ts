import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { run } from '../impl.js';

const root = mkdtempSync(join(tmpdir(), 'custom-function-run-integration-'));
const project = join(root, 'transcend', 'custom-functions');

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('custom-functions run with Deno 2.4.5', () => {
  it('prints console output from a selected local function', async () => {
    mkdirSync(join(project, 'functions'), { recursive: true });
    mkdirSync(join(project, 'test-payloads'), { recursive: true });
    writeFileSync(
      join(project, 'transcend-functions.yml'),
      `functions:
  - name: Log locally
    code: ./functions/log-locally.ts
    test-payload: ./test-payloads/log-locally.json
    env:
      TEST_TOKEN: <<parameters.testToken>>
  - name: Unrelated incomplete function
    code: ./functions/missing.ts
    env:
      API_TOKEN: <<parameters.unrelatedToken>>
`,
    );
    writeFileSync(
      join(project, 'functions', 'log-locally.ts'),
      `import type { CustomFunction } from '@transcend-io/custom-function-types';

export default function ({ environment, payload }: CustomFunction.GeneralArgument): void {
  console.log('function log:', payload.message);
  console.log('parameter:', environment.TEST_TOKEN);
}
`,
    );
    writeFileSync(join(project, 'test-payloads', 'log-locally.json'), '{"message":"visible"}\n');
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await run.call(
      context,
      {
        function: 'Log locally',
        parameters: '',
        variables: '',
        noInteractive: true,
        allowNetwork: false,
      },
      'transcend/custom-functions',
    );

    expect(context.stdout).toContain('function log: visible');
    expect(context.stdout).toContain('parameter: [REDACTED]');
    expect(context.stdout).toContain('Passed "Log locally" (payload 1)');
    expect(context.stderr).toContain(
      'Using local placeholder values for environment parameters: testToken.',
    );
    expect(context.process.exitCode).toBeUndefined();
  }, 30_000);

  it('continues through later payloads after one fails', async () => {
    writeFileSync(
      join(project, 'transcend-functions.yml'),
      `functions:
  - name: Multiple payloads
    code: ./functions/multiple.ts
    test-payloads:
      - payload: ./test-payloads/fails.json
      - payload: ./test-payloads/passes.json
`,
    );
    writeFileSync(
      join(project, 'functions', 'multiple.ts'),
      `export default function ({ payload }: { payload: { fail?: boolean } }): void {
  if (payload.fail) throw new Error('expected failure');
  console.log('later payload ran');
}
`,
    );
    writeFileSync(join(project, 'test-payloads', 'fails.json'), '{"fail":true}\n');
    writeFileSync(join(project, 'test-payloads', 'passes.json'), '{}\n');
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await run.call(
      context,
      {
        function: 'Multiple payloads',
        parameters: '',
        variables: '',
        noInteractive: true,
        allowNetwork: false,
      },
      'transcend/custom-functions',
    );

    expect(context.stderr).toContain('expected failure');
    expect(context.stdout).toContain('later payload ran');
    expect(context.stdout).toContain('Passed "Multiple payloads" (payload 2)');
    expect(context.process.exitCode).toBe(1);
  }, 30_000);

  it('rejects source paths that escape through a symlink', async () => {
    const outsideSource = join(root, 'outside.ts');
    writeFileSync(outsideSource, 'export default () => {};\n');
    symlinkSync(outsideSource, join(project, 'functions', 'linked.ts'));
    writeFileSync(
      join(project, 'transcend-functions.yml'),
      `functions:
  - name: Linked source
    code: ./functions/linked.ts
    test-payload: ./test-payloads/passes.json
`,
    );
    const context = buildContextForTest({
      cwd: root,
      stdinIsTTY: false,
    });

    await expect(
      run.call(
        context,
        {
          function: 'Linked source',
          parameters: '',
          variables: '',
          noInteractive: true,
          allowNetwork: false,
        },
        'transcend/custom-functions',
      ),
    ).rejects.toThrow('Refusing to access path outside project root through a symlink');
  });
});

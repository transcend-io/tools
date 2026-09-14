import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runCapturedProcess } from '../../../../lib/cli/run-captured-process.js';
import { POLICY_REGAL_CONFIG_TEMPLATE } from '../../../../lib/policy/policy-scaffold-templates.js';
import { buildContextForTest } from '../../../../lib/tests/helpers/buildContextForTest.js';
import { lint } from '../impl.js';

const temporaryDirectories: string[] = [];

/**
 * Create an isolated policy directory for runtime-backed lint tests.
 *
 * @returns Temporary policy directory
 */
function makePolicyDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'policy-lint-integration-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('policy lint with OPA and Regal', () => {
  it('rejects production policy that depends on a local test module', async () => {
    const directory = makePolicyDirectory();
    writeFileSync(join(directory, 'manifest.json'), '{"roots":["policy_engine"]}\n');
    writeFileSync(join(directory, '.regal.yaml'), POLICY_REGAL_CONFIG_TEMPLATE);
    writeFileSync(
      join(directory, 'policy.rego'),
      `package policy_engine

import rego.v1

allow if {
	is_allowed(input)
}
`,
    );
    writeFileSync(
      join(directory, 'helper_test.rego'),
      `package policy_engine

import rego.v1

is_allowed(_) if {
	true
}

test_allow if {
	allow
}
`,
    );
    const context = buildContextForTest({ cwd: directory, stdinIsTTY: false });

    await lint.call(
      context,
      {
        fix: true,
        noInteractive: true,
        json: true,
      },
      directory,
      runCapturedProcess,
    );

    expect(JSON.parse(context.stdout)).toMatchObject({
      status: 'failed',
      checks: expect.arrayContaining([{ name: 'opa-check', status: 'failed' }]),
      diagnostics: expect.arrayContaining([
        expect.objectContaining({
          code: 'opa.check',
          message: expect.stringMatching(/undefined function[\s\S]*is_allowed/u),
        }),
      ]),
    });
  });
});

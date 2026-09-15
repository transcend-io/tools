import { buildCommand } from '@stricli/core';

import { policyWorkspaceOrBundleDirectoryParameter } from '../helpers/policyCommandParameters.js';

/** Output formats supported by `opa test --format`. */
export const POLICY_TEST_FORMATS = ['pretty', 'json', 'gobench'] as const;

/** One `opa test --format` value. */
export type PolicyTestFormat = (typeof POLICY_TEST_FORMATS)[number];

export const testCommand = buildCommand({
  loader: async () => {
    const { test } = await import('./impl.js');
    return test;
  },
  parameters: {
    flags: {
      format: {
        kind: 'enum',
        values: POLICY_TEST_FORMATS,
        brief: 'opa test --format',
        default: 'pretty',
      },
      verbose: {
        kind: 'boolean',
        brief: 'opa test --verbose',
        default: false,
      },
      run: {
        kind: 'parsed',
        parse: String,
        brief: 'opa test --run (regex filter)',
        optional: true,
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [policyWorkspaceOrBundleDirectoryParameter],
    },
  },
  docs: {
    brief: 'Run OPA tests against local policy bundles',
    fullDescription:
      'Defaults to the policy workspace (`transcend/policy`) and runs `opa test -b --fail-on-empty` for every ' +
      'child directory that contains a `.manifest`. Pass one bundle path to test a single unit. ' +
      'Pass-through flags cover format, verbose, and run; `-b` and `--fail-on-empty` stay owned by the CLI. ' +
      'Requires the `opa` CLI on PATH. No Transcend API key is needed.',
  },
});

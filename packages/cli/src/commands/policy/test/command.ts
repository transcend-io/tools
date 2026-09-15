import { buildCommand } from '@stricli/core';

import { policyWorkspaceOrBundleDirectoryParameter } from '../helpers/policyCommandParameters.js';

/** Output formats supported by `opa test --format`. */
export const POLICY_TEST_FORMATS = ['pretty', 'json', 'gobench'] as const;

/** One `opa test --format` value. */
export type PolicyTestFormat = (typeof POLICY_TEST_FORMATS)[number];

/** Explanation modes supported by `opa test --explain`. */
export const POLICY_TEST_EXPLAIN_MODES = ['fails', 'full', 'notes', 'debug'] as const;

/** One `opa test --explain` value. */
export type PolicyTestExplainMode = (typeof POLICY_TEST_EXPLAIN_MODES)[number];

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
      coverage: {
        kind: 'boolean',
        brief: 'opa test --coverage',
        default: false,
      },
      threshold: {
        kind: 'parsed',
        parse: String,
        brief: 'opa test --threshold (coverage %, requires --coverage)',
        optional: true,
      },
      timeout: {
        kind: 'parsed',
        parse: String,
        brief: 'opa test --timeout (e.g. 5s)',
        optional: true,
      },
      'var-values': {
        kind: 'boolean',
        brief: 'opa test --var-values',
        default: false,
      },
      explain: {
        kind: 'enum',
        values: POLICY_TEST_EXPLAIN_MODES,
        brief: 'opa test --explain',
        optional: true,
      },
      schema: {
        kind: 'parsed',
        parse: String,
        brief: 'opa test --schema (file or directory)',
        optional: true,
      },
      'exit-zero-on-skipped': {
        kind: 'boolean',
        brief: 'opa test --exit-zero-on-skipped',
        default: false,
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
      'Pass-through flags cover format, verbose, run, coverage, threshold, timeout, var-values, explain, schema, and ' +
      'exit-zero-on-skipped; `-b` and `--fail-on-empty` stay owned by the CLI. ' +
      'Requires the `opa` CLI on PATH. No Transcend API key is needed.',
  },
});

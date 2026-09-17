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
        brief: 'Output format (opa test --format)',
        default: 'pretty',
      },
      verbose: {
        kind: 'boolean',
        brief: 'Show detailed test results (opa test --verbose)',
        default: false,
      },
      run: {
        kind: 'parsed',
        parse: String,
        brief: 'Regex filter for test names (opa test --run)',
        optional: true,
      },
      coverage: {
        kind: 'boolean',
        brief: 'Report coverage (opa test --coverage)',
        default: false,
      },
      threshold: {
        kind: 'parsed',
        parse: String,
        brief: 'Fail when coverage is below this % (requires --coverage)',
        optional: true,
      },
      timeout: {
        kind: 'parsed',
        parse: String,
        brief: 'Test timeout duration, e.g. 5s (opa test --timeout)',
        optional: true,
      },
      'var-values': {
        kind: 'boolean',
        brief: 'Show variable values in failures (opa test --var-values)',
        default: false,
      },
      explain: {
        kind: 'enum',
        values: POLICY_TEST_EXPLAIN_MODES,
        brief: 'Explanation mode (opa test --explain)',
        optional: true,
      },
      schema: {
        kind: 'parsed',
        parse: String,
        brief: 'JSON Schema file or directory for input type-checking (opa test --schema)',
        optional: true,
      },
      'exit-zero-on-skipped': {
        kind: 'boolean',
        brief: 'Exit 0 when all matching tests are skipped (opa test --exit-zero-on-skipped)',
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

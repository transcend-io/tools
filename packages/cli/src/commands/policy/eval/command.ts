import { buildCommand } from '@stricli/core';

import { policyBundleDirectoryParameter } from '../helpers/policyCommandParameters.js';

/** Output formats supported by `opa eval --format`. */
export const POLICY_EVAL_FORMATS = [
  'pretty',
  'json',
  'values',
  'bindings',
  'source',
  'raw',
  'discard',
] as const;

/** One `opa eval --format` value. */
export type PolicyEvalFormat = (typeof POLICY_EVAL_FORMATS)[number];

/** Explanation modes supported by `opa eval --explain`. */
export const POLICY_EVAL_EXPLAIN_MODES = ['off', 'full', 'notes', 'fails', 'debug'] as const;

/** One `opa eval --explain` value. */
export type PolicyEvalExplainMode = (typeof POLICY_EVAL_EXPLAIN_MODES)[number];

export const evalCommand = buildCommand({
  loader: async () => {
    const { _eval } = await import('./impl.js');
    return _eval;
  },
  parameters: {
    flags: {
      package: {
        kind: 'parsed',
        parse: String,
        brief: 'OPA query path to evaluate (e.g. data.example.result)',
      },
      input: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to a JSON envelope input file (mutually exclusive with --stdin-input)',
        optional: true,
      },
      'stdin-input': {
        kind: 'boolean',
        brief: 'Read the input document from stdin (opa eval --stdin-input)',
        default: false,
      },
      format: {
        kind: 'enum',
        values: POLICY_EVAL_FORMATS,
        brief: 'Output format (opa eval --format)',
        default: 'pretty',
      },
      schema: {
        kind: 'parsed',
        parse: String,
        brief: 'JSON Schema file or directory for input type-checking (opa eval --schema)',
        optional: true,
      },
      explain: {
        kind: 'enum',
        values: POLICY_EVAL_EXPLAIN_MODES,
        brief: 'Explanation mode (opa eval --explain)',
        optional: true,
      },
      metrics: {
        kind: 'boolean',
        brief: 'Report evaluation metrics (opa eval --metrics)',
        default: false,
      },
      instrument: {
        kind: 'boolean',
        brief: 'Enable instrumentation; implies --metrics (opa eval --instrument)',
        default: false,
      },
      profile: {
        kind: 'boolean',
        brief: 'Enable performance profiling (opa eval --profile)',
        default: false,
      },
      timeout: {
        kind: 'parsed',
        parse: String,
        brief: 'Evaluation timeout duration, e.g. 5s (opa eval --timeout)',
        optional: true,
      },
      'var-values': {
        kind: 'boolean',
        brief: 'Show variable values with --explain (opa eval --var-values)',
        default: false,
      },
      'show-builtin-errors': {
        kind: 'boolean',
        brief: 'Collect and report built-in errors (opa eval --show-builtin-errors)',
        default: false,
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [policyBundleDirectoryParameter],
    },
  },
  docs: {
    brief: 'Evaluate one envelope against a local policy bundle',
    fullDescription:
      'Wraps `opa eval` for local policy debugging against one bundle directory. ' +
      'Always loads the directory as a bundle (`-b`) and ignores local `*_test.rego` files (same as check/publish — ' +
      'tests are not shipped to Evaluate). Provide input via `--input` or `--stdin-input` (exactly one). ' +
      'Pass-through flags cover format, schema, explain, metrics, instrument, profile, timeout, var-values, and ' +
      'show-builtin-errors. `-b` and `--ignore` stay owned by the CLI. Exit-on-result flags like OPA `--fail` are ' +
      'omitted: production Evaluate uses the Data API (policy deny is a successful evaluation; missing result is an ' +
      'engine failure), so process exit-on-result is not Evaluate parity. Requires an explicit directory containing a ' +
      '`.manifest`, and the `opa` CLI on PATH. No Transcend API key is needed.',
  },
});

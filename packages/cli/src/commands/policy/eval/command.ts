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
        brief: 'OPA query to evaluate (e.g. data.example.result)',
      },
      input: {
        kind: 'parsed',
        parse: String,
        brief: 'Path to a JSON envelope input file',
      },
      format: {
        kind: 'enum',
        values: POLICY_EVAL_FORMATS,
        brief: 'opa eval --format',
        default: 'pretty',
      },
      schema: {
        kind: 'parsed',
        parse: String,
        brief: 'opa eval --schema (file or directory)',
        optional: true,
      },
      explain: {
        kind: 'enum',
        values: POLICY_EVAL_EXPLAIN_MODES,
        brief: 'opa eval --explain',
        optional: true,
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
      'Always loads the directory as a bundle (`-b`). Pass-through flags cover format, schema, and explain; ' +
      'exit-on-result flags like `--fail` are omitted until Policy Engine evaluation semantics are aligned. ' +
      'Requires an explicit directory containing a `.manifest`, and the `opa` CLI on PATH. ' +
      'No Transcend API key is needed.',
  },
});

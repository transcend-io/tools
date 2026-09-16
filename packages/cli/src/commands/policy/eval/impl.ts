import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { resolvePolicyProjectDirectory } from '../../../lib/policy/policy-project-discovery.js';
import { assertOpaInstalled, runOpa } from '../helpers/index.js';
import type { PolicyEvalExplainMode, PolicyEvalFormat } from './command.js';

/** CLI flags for `transcend policy eval`. */
export interface EvalCommandFlags {
  /** OPA query to evaluate (e.g. `data.example.result`). */
  package: string;
  /** Path to a JSON envelope input file. */
  input?: string;
  /** Read the input document from stdin (`opa eval --stdin-input`). */
  'stdin-input': boolean;
  /** `opa eval --format` value. */
  format: PolicyEvalFormat;
  /** Optional `opa eval --schema` path. */
  schema?: string;
  /** Optional `opa eval --explain` mode. */
  explain?: PolicyEvalExplainMode;
  /** `opa eval --metrics`. */
  metrics: boolean;
  /** `opa eval --instrument`. */
  instrument: boolean;
  /** `opa eval --profile`. */
  profile: boolean;
  /** Optional `opa eval --timeout` duration. */
  timeout?: string;
  /** `opa eval --var-values`. */
  'var-values': boolean;
  /** `opa eval --show-builtin-errors`. */
  'show-builtin-errors': boolean;
}

/**
 * Evaluate one envelope against a local policy bundle via `opa eval`.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param directory - Policy bundle directory containing a `.manifest`
 */
export async function _eval(
  this: LocalContext,
  {
    package: query,
    input,
    'stdin-input': stdinInput,
    format,
    schema,
    explain,
    metrics,
    instrument,
    profile,
    timeout,
    'var-values': varValues,
    'show-builtin-errors': showBuiltinErrors,
  }: EvalCommandFlags,
  directory: string,
): Promise<void> {
  doneInputValidation(this.process);

  assertOpaInstalled();

  if (stdinInput && input) {
    throw new Error('Pass either --input or --stdin-input, not both.');
  }
  if (!stdinInput && !input) {
    throw new Error('Provide an input document with --input <path> or --stdin-input.');
  }

  let inputArgs: string[];
  let inputLabel: string;
  if (stdinInput) {
    inputArgs = ['--stdin-input'];
    inputLabel = 'stdin';
  } else {
    const inputPath = path.resolve(this.process.cwd(), input!);
    if (!this.fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    inputArgs = ['--input', inputPath];
    inputLabel = inputPath;
  }

  const bundlePath = resolvePolicyProjectDirectory(this.process.cwd(), directory);
  const schemaPath = schema ? path.resolve(this.process.cwd(), schema) : undefined;
  if (schemaPath && !this.fs.existsSync(schemaPath)) {
    throw new Error(`Schema path not found: ${schemaPath}`);
  }

  // Match lint/publish and production Evaluate: `*_test.rego` is local-only and
  // never shipped. Keep `-b` / `--ignore` owned by the CLI (not pass-through).
  const args = [
    'eval',
    '--format',
    format,
    ...inputArgs,
    '-b',
    bundlePath,
    '--ignore',
    '*_test.rego',
    ...(schemaPath ? ['--schema', schemaPath] : []),
    ...(explain && explain !== 'off' ? ['--explain', explain] : []),
    ...(metrics ? ['--metrics'] : []),
    ...(instrument ? ['--instrument'] : []),
    ...(profile ? ['--profile'] : []),
    ...(timeout ? ['--timeout', timeout] : []),
    ...(varValues ? ['--var-values'] : []),
    ...(showBuiltinErrors ? ['--show-builtin-errors'] : []),
    query,
  ];

  this.logger.info(colors.green(`Evaluating ${query} with input ${inputLabel}...`));

  const exitCode = await runOpa(args);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }
}

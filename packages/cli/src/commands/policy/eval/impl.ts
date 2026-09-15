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
  input: string;
  /** `opa eval --format` value. */
  format: PolicyEvalFormat;
  /** Optional `opa eval --schema` path. */
  schema?: string;
  /** Optional `opa eval --explain` mode. */
  explain?: PolicyEvalExplainMode;
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
  { package: query, input, format, schema, explain }: EvalCommandFlags,
  directory: string,
): Promise<void> {
  doneInputValidation(this.process);

  assertOpaInstalled();

  const inputPath = path.resolve(this.process.cwd(), input);
  if (!this.fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const bundlePath = resolvePolicyProjectDirectory(this.process.cwd(), directory);
  const schemaPath = schema ? path.resolve(this.process.cwd(), schema) : undefined;
  if (schemaPath && !this.fs.existsSync(schemaPath)) {
    throw new Error(`Schema path not found: ${schemaPath}`);
  }

  const args = [
    'eval',
    '--format',
    format,
    '--input',
    inputPath,
    '-b',
    bundlePath,
    ...(schemaPath ? ['--schema', schemaPath] : []),
    ...(explain && explain !== 'off' ? ['--explain', explain] : []),
    query,
  ];

  this.logger.info(colors.green(`Evaluating ${query} with input ${inputPath}...`));

  const exitCode = await runOpa(args);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }
}

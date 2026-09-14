import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import { assertOpaInstalled, runOpa } from '../helpers/index.js';

/** CLI flags for `transcend policy eval`. */
export interface EvalCommandFlags {
  /** OPA package/query to evaluate (e.g. `data.transcend.decision`) */
  pkg: string;
  /** Path to a JSON envelope input file */
  input: string;
}

/**
 * Evaluate one envelope against a local policy bundle via `opa eval`.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param directory - Policy project directory
 */
export async function _eval(
  this: LocalContext,
  { pkg, input }: EvalCommandFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): Promise<void> {
  doneInputValidation(this.process);

  assertOpaInstalled();

  const inputPath = path.resolve(this.process.cwd(), input);
  if (!this.fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const bundlePath = resolvePolicyProjectDirectory(this.process.cwd(), directory);
  const args = ['eval', '--format', 'pretty', '--input', inputPath, '-b', bundlePath];
  args.push(pkg);

  this.logger.info(colors.green(`Evaluating ${pkg} with input ${inputPath}...`));

  const exitCode = await runOpa(args);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }
}

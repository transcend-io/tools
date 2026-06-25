import fs from 'node:fs';
import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import { assertOpaInstalled, runOpa } from '../_helpers.js';

/** CLI flags for `transcend policy eval`. */
export interface EvalCommandFlags {
  /** OPA package/query to evaluate (e.g. `data.transcend.decision`) */
  pkg: string;
  /** Path to a JSON envelope input file */
  input: string;
  /** Optional local policy bundle directory */
  bundle?: string;
}

/**
 * Evaluate one envelope against a local policy bundle via `opa eval`.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function _eval(
  this: LocalContext,
  { pkg, input, bundle }: EvalCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  assertOpaInstalled();

  const inputPath = path.resolve(input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const args = ['eval', '--format', 'pretty', '--input', inputPath];
  if (bundle) {
    args.push('-b', path.resolve(bundle));
  }
  args.push(pkg);

  logger.info(colors.green(`Evaluating ${pkg} with input ${inputPath}...`));

  const exitCode = await runOpa(args);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }
}

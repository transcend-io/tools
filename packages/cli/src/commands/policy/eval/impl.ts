import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { assertOpaInstalled, runOpa } from '../helpers/index.js';

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
  doneInputValidation(this.process);

  assertOpaInstalled();

  const inputPath = this.path.resolve(input);
  if (!this.fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const args = ['eval', '--format', 'pretty', '--input', inputPath];
  if (bundle) {
    args.push('-b', this.path.resolve(bundle));
  }
  args.push(pkg);

  this.logger.info(colors.green(`Evaluating ${pkg} with input ${inputPath}...`));

  const exitCode = await runOpa(args);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }
}

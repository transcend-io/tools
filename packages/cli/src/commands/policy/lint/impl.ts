import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import { assertOpaInstalled, runOpa } from '../_helpers.js';

/** CLI flags for `transcend policy lint`. */
export interface LintCommandFlags {
  /** Directory containing Rego policy files */
  dir: string;
}

/**
 * Local Rego lint and format check via `opa check` and `opa fmt --diff`.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function lint(this: LocalContext, { dir }: LintCommandFlags): Promise<void> {
  doneInputValidation(this.process.exit);

  assertOpaInstalled();
  const resolvedDir = path.resolve(dir);

  logger.info(colors.green(`Linting policy bundle in ${resolvedDir}...`));

  const checkCode = await runOpa(['check', '--strict', resolvedDir]);
  if (checkCode !== 0) {
    this.process.exit(checkCode);
  }

  const fmtCode = await runOpa(['fmt', '--diff', resolvedDir]);
  if (fmtCode !== 0) {
    logger.error(colors.red('Policy files are not formatted. Run `opa fmt -w` to fix.'));
    this.process.exit(fmtCode);
  }

  logger.info(colors.green('Policy lint passed.'));
}

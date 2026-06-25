import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { logger } from '../../../logger.js';
import { assertOpaInstalled, runOpa } from '../_helpers.js';

/** CLI flags for `transcend policy test`. */
export interface TestCommandFlags {
  /** Directory containing Rego policy files and tests */
  dir: string;
}

/**
 * Run OPA tests against a local policy bundle.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function test(this: LocalContext, { dir }: TestCommandFlags): Promise<void> {
  doneInputValidation(this.process.exit);

  assertOpaInstalled();
  const resolvedDir = path.resolve(dir);

  logger.info(colors.green(`Running policy tests in ${resolvedDir}...`));

  const exitCode = await runOpa(['test', resolvedDir]);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }

  logger.info(colors.green('Policy tests passed.'));
}

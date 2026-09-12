import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import { assertOpaInstalled, runOpa } from '../helpers/index.js';

/** CLI flags for `transcend policy test`. */
export type TestCommandFlags = Record<string, never>;

/**
 * Run OPA tests against a local policy bundle.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param directory - Policy project directory
 */
export async function test(
  this: LocalContext,
  _flags: TestCommandFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): Promise<void> {
  doneInputValidation(this.process);

  assertOpaInstalled();
  const resolvedDir = resolvePolicyProjectDirectory(this.process.cwd(), directory);

  this.logger.info(colors.green(`Running policy tests in ${resolvedDir}...`));

  const exitCode = await runOpa(['test', resolvedDir]);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }

  this.logger.info(colors.green('Policy tests passed.'));
}

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  assertOpaInstalled,
  policyDependenciesFromContext,
  runOpa,
  type PolicyDependencies,
} from '../helpers/index.js';

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
 * @param dependencies - Context-derived policy helper dependencies
 */
export async function test(
  this: LocalContext,
  { dir }: TestCommandFlags,
  dependencies: Pick<
    PolicyDependencies,
    'assertOpaInstalled' | 'runOpa'
  > = policyDependenciesFromContext(this),
): Promise<void> {
  doneInputValidation(this.process);

  assertOpaInstalled(dependencies.assertOpaInstalled);
  const resolvedDir = this.path.resolve(dir);

  this.logger.info(colors.green(`Running policy tests in ${resolvedDir}...`));

  const exitCode = await runOpa(['test', resolvedDir], {}, dependencies.runOpa);
  if (exitCode !== 0) {
    this.process.exit(exitCode);
  }

  this.logger.info(colors.green('Policy tests passed.'));
}

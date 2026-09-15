import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyBundleDirectories,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import { assertOpaInstalled, runOpa } from '../helpers/index.js';

/** CLI flags for `transcend policy test`. */
export type TestCommandFlags = Record<string, never>;

/**
 * Run OPA tests against local policy bundles.
 *
 * With no directory (or the default workspace path), discovers every immediate
 * child that contains a `.manifest` and tests each. Pass one bundle path to
 * test a single publishable unit.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param directory - Policy workspace or bundle directory
 */
export async function test(
  this: LocalContext,
  _flags: TestCommandFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): Promise<void> {
  doneInputValidation(this.process);

  assertOpaInstalled();
  const resolvedDir = resolvePolicyProjectDirectory(this.process.cwd(), directory);
  if (!this.fs.existsSync(resolvedDir) || !this.fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Policy directory does not exist or is not a directory: ${resolvedDir}`);
  }

  const bundleDirectories = discoverPolicyBundleDirectories(this, resolvedDir);
  if (bundleDirectories.length === 0) {
    throw new Error(
      'No publishable policy bundles found. Add one with `transcend policy new`, ' +
        'or pass a directory that contains a `.manifest`.',
    );
  }

  for (const bundleDirectory of bundleDirectories) {
    this.logger.info(colors.green(`Running policy tests in ${bundleDirectory}...`));
    const exitCode = await runOpa(['test', '--fail-on-empty', '-b', bundleDirectory]);
    if (exitCode !== 0) {
      this.process.exit(exitCode);
    }
  }

  this.logger.info(colors.green('Policy tests passed.'));
}

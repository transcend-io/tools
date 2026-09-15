import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyBundleDirectories,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import { assertOpaInstalled, runOpa } from '../helpers/index.js';
import type { PolicyTestExplainMode, PolicyTestFormat } from './command.js';

/** CLI flags for `transcend policy test`. */
export interface TestCommandFlags {
  /** `opa test --format` value. */
  format: PolicyTestFormat;
  /** `opa test --verbose`. */
  verbose: boolean;
  /** Optional `opa test --run` regex. */
  run?: string;
  /** `opa test --coverage`. */
  coverage: boolean;
  /** Optional `opa test --threshold` coverage percent. */
  threshold?: string;
  /** Optional `opa test --timeout` duration. */
  timeout?: string;
  /** `opa test --var-values`. */
  'var-values': boolean;
  /** Optional `opa test --explain` mode. */
  explain?: PolicyTestExplainMode;
  /** Optional `opa test --schema` path. */
  schema?: string;
  /** `opa test --exit-zero-on-skipped`. */
  'exit-zero-on-skipped': boolean;
}

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
  {
    format,
    verbose,
    run,
    coverage,
    threshold,
    timeout,
    'var-values': varValues,
    explain,
    schema,
    'exit-zero-on-skipped': exitZeroOnSkipped,
  }: TestCommandFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
): Promise<void> {
  doneInputValidation(this.process);

  assertOpaInstalled();
  const resolvedDir = resolvePolicyProjectDirectory(this.process.cwd(), directory);
  if (!this.fs.existsSync(resolvedDir) || !this.fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(`Policy directory does not exist or is not a directory: ${resolvedDir}`);
  }

  if (threshold !== undefined && !coverage) {
    throw new Error('--threshold requires --coverage.');
  }
  if (threshold !== undefined) {
    const parsed = Number(threshold);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      throw new Error(`--threshold must be a number between 0 and 100, got: ${threshold}`);
    }
  }

  const schemaPath = schema ? path.resolve(this.process.cwd(), schema) : undefined;
  if (schemaPath && !this.fs.existsSync(schemaPath)) {
    throw new Error(`Schema path not found: ${schemaPath}`);
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
    const exitCode = await runOpa([
      'test',
      '--fail-on-empty',
      '-b',
      bundleDirectory,
      '--format',
      format,
      ...(verbose ? ['--verbose'] : []),
      ...(run ? ['--run', run] : []),
      ...(coverage ? ['--coverage'] : []),
      ...(threshold !== undefined ? ['--threshold', threshold] : []),
      ...(timeout ? ['--timeout', timeout] : []),
      ...(varValues ? ['--var-values'] : []),
      ...(explain ? ['--explain', explain] : []),
      ...(schemaPath ? ['--schema', schemaPath] : []),
      ...(exitZeroOnSkipped ? ['--exit-zero-on-skipped'] : []),
    ]);
    if (exitCode !== 0) {
      this.process.exit(exitCode);
    }
  }

  this.logger.info(colors.green('Policy tests passed.'));
}

import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  runCapturedProcess,
  type CapturedProcessRunner,
} from '../../../lib/cli/run-captured-process.js';
import { validatePolicyBundleContents } from '../../../lib/policy/policy-bundle-manifest.js';
import {
  type PolicyCheckDiagnostic,
  type PolicyCheckMultiResult,
  type PolicyCheckResult,
  type PolicyCheckStep,
  POLICY_CHECK_MULTI_RESULT_VERSION,
  POLICY_CHECK_RESULT_VERSION,
  POLICY_CHECK_STEP_LABELS,
  POLICY_CHECK_STEP_NAMES,
} from '../../../lib/policy/policy-check-model.js';
import { getPolicyProcessFailureMessage } from '../../../lib/policy/policy-process-output.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyBundleDirectories,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import { POLICY_MANIFEST_FILENAME } from '../../../lib/policy/policy-scaffold-templates.js';
import { collectPolicyRegoFiles } from '../helpers/collectPolicyRegoFiles.js';
import { probePolicyToolVersions } from '../helpers/probePolicyToolVersions.js';
import { runOpaFormatStep } from '../helpers/runOpaFormatStep.js';
import { runRegalLintStep } from '../helpers/runRegalLintStep.js';

/** CLI flags for `transcend policy check`. */
export interface CheckCommandFlags {
  /** Apply OPA formatting. */
  fix: boolean;
  /** Disable the optional formatting confirmation. */
  noInteractive: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/**
 * Render the terminal summary for a policy verification result.
 *
 * @param context - CLI context
 * @param result - Completed verification result
 * @param heading - Optional section heading when checking multiple bundles
 */
function renderResult(context: LocalContext, result: PolicyCheckResult, heading?: string): void {
  if (heading) {
    context.logger.info(`${colors.bold(heading)}\n`);
  } else {
    context.logger.info(`${colors.bold('Policy verification')}\n`);
  }
  result.checks.forEach(({ name, status }) => {
    const label = status === 'passed' ? 'PASS' : status === 'failed' ? 'FAIL' : 'SKIP';
    const styledLabel =
      status === 'passed'
        ? colors.green(label)
        : status === 'failed'
          ? colors.red(label)
          : colors.yellow(label);
    const version =
      name === 'opa-version' && result.tools.opa
        ? ` (${result.tools.opa})`
        : name === 'regal-version' && result.tools.regal
          ? ` (${result.tools.regal})`
          : '';
    context.logger.info(`${styledLabel} ${POLICY_CHECK_STEP_LABELS[name]}${version}`);
  });
  if (result.diagnostics.length > 0) {
    context.logger.error('');
  }
  result.diagnostics.forEach((diagnostic) => {
    const location = diagnostic.path ? `${diagnostic.path}: ` : '';
    context.logger.error(
      colors.red(`error [${diagnostic.code}]: ${location}${diagnostic.message}`),
    );
  });
  if (result.status === 'passed') {
    context.logger.info('');
    context.logger.info(colors.green('Policy verification passed.'));
  } else {
    context.logger.error('');
    context.logger.error(colors.red('Policy verification failed.'));
  }
}

/**
 * Verify one publishable policy bundle directory.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param resolvedDir - Absolute bundle directory
 * @param runner - Captured subprocess runner
 * @returns Completed verification result
 */
async function checkBundle(
  this: LocalContext,
  { fix, noInteractive, json }: CheckCommandFlags,
  resolvedDir: string,
  runner: CapturedProcessRunner,
): Promise<PolicyCheckResult> {
  const checks: PolicyCheckStep[] = POLICY_CHECK_STEP_NAMES.map((name) => ({
    name,
    status: 'skipped',
  }));
  const diagnostics: PolicyCheckDiagnostic[] = [];
  const result: PolicyCheckResult = {
    version: POLICY_CHECK_RESULT_VERSION,
    status: 'passed',
    directory: resolvedDir,
    fix,
    tools: { opa: null, regal: null },
    checks,
    unformattedFiles: [],
    fixedFiles: [],
    diagnostics,
  };
  const setStatus = (name: PolicyCheckStep['name'], status: PolicyCheckStep['status']): void => {
    checks.find((check) => check.name === name)!.status = status;
  };
  const addError = (code: string, message: string, diagnosticPath?: string): void => {
    diagnostics.push({
      code,
      severity: 'error',
      message,
      ...(diagnosticPath ? { path: diagnosticPath } : {}),
    });
  };

  if (!this.fs.existsSync(resolvedDir) || !this.fs.statSync(resolvedDir).isDirectory()) {
    setStatus('manifest', 'failed');
    addError(
      'project.directory',
      `Policy directory does not exist or is not a directory: ${resolvedDir}`,
      path.relative(this.process.cwd(), resolvedDir),
    );
    result.status = 'failed';
    return result;
  }

  const manifestPath = path.join(resolvedDir, POLICY_MANIFEST_FILENAME);
  try {
    validatePolicyBundleContents(
      this.fs.existsSync(manifestPath) ? this.fs.readFileSync(manifestPath, 'utf8') : undefined,
      collectPolicyRegoFiles(this, resolvedDir),
    );
    setStatus('manifest', 'passed');
  } catch (error) {
    setStatus('manifest', 'failed');
    addError(
      'manifest.invalid',
      error instanceof Error ? error.message : String(error),
      path.relative(this.process.cwd(), manifestPath),
    );
  }

  const toolVersions = await probePolicyToolVersions.call(this, resolvedDir, runner);
  result.tools = { opa: toolVersions.opa, regal: toolVersions.regal };
  setStatus('opa-version', toolVersions.opaStatus);
  setStatus('regal-version', toolVersions.regalStatus);
  toolVersions.diagnostics.forEach((diagnostic) => {
    addError(diagnostic.code, diagnostic.message);
  });

  if (result.tools.opa) {
    const formatStep = await runOpaFormatStep.call(this, {
      resolvedDir,
      fix,
      noInteractive,
      json,
      fixCommandHint: 'transcend policy check --fix',
      runner,
    });
    result.unformattedFiles = formatStep.unformattedFiles;
    result.fixedFiles = formatStep.fixedFiles;
    setStatus('format', formatStep.status);
    formatStep.diagnostics.forEach((diagnostic) => {
      addError(diagnostic.code, diagnostic.message);
    });

    const checkResult = await runner(
      'opa',
      ['check', '--strict', '--ignore', '*_test.rego', resolvedDir],
      { cwd: resolvedDir },
      this,
    );
    if (checkResult.code === 0) {
      setStatus('opa-check', 'passed');
    } else {
      setStatus('opa-check', 'failed');
      addError(
        'opa.check',
        getPolicyProcessFailureMessage(
          checkResult,
          `opa check failed with exit code ${checkResult.code}`,
        ),
      );
    }
  }

  if (result.tools.regal) {
    const regalStep = await runRegalLintStep.call(this, { resolvedDir, runner });
    setStatus('regal-lint', regalStep.status);
    regalStep.diagnostics.forEach((diagnostic) => {
      addError(diagnostic.code, diagnostic.message);
    });
  }

  if (result.tools.opa) {
    const testResult = await runner(
      'opa',
      ['test', '--fail-on-empty', '-b', resolvedDir],
      { cwd: resolvedDir },
      this,
    );
    if (testResult.code === 0) {
      setStatus('opa-test', 'passed');
    } else {
      setStatus('opa-test', 'failed');
      addError(
        'opa.test',
        getPolicyProcessFailureMessage(
          testResult,
          `opa test --fail-on-empty -b failed with exit code ${testResult.code}`,
        ),
      );
    }
  }

  result.status = checks.some(({ status }) => status === 'failed') ? 'failed' : 'passed';
  return result;
}

/**
 * Verify local policy bundles with the shared upload contract, OPA, and Regal.
 *
 * With no directory (or the default workspace path), discovers every immediate
 * child that contains a `.manifest` and verifies each. Pass one bundle path to
 * verify a single publishable unit.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param directory - Policy workspace or bundle directory
 * @param runner - Captured subprocess runner
 */
export async function check(
  this: LocalContext,
  flags: CheckCommandFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
  runner: CapturedProcessRunner = runCapturedProcess,
): Promise<void> {
  doneInputValidation(this.process);

  const { fix = false, noInteractive = false, json = false } = flags;
  const resolvedDir = resolvePolicyProjectDirectory(this.process.cwd(), directory);

  if (!this.fs.existsSync(resolvedDir) || !this.fs.statSync(resolvedDir).isDirectory()) {
    const missing: PolicyCheckResult = {
      version: POLICY_CHECK_RESULT_VERSION,
      status: 'failed',
      directory: resolvedDir,
      fix,
      tools: { opa: null, regal: null },
      checks: POLICY_CHECK_STEP_NAMES.map((name) => ({
        name,
        status: name === 'manifest' ? 'failed' : 'skipped',
      })),
      unformattedFiles: [],
      fixedFiles: [],
      diagnostics: [
        {
          code: 'project.directory',
          severity: 'error',
          message: `Policy directory does not exist or is not a directory: ${resolvedDir}`,
          path: path.relative(this.process.cwd(), resolvedDir),
        },
      ],
    };
    if (json) {
      this.process.stdout.write(`${JSON.stringify(missing)}\n`);
    } else {
      renderResult(this, missing);
    }
    this.process.exitCode = 1;
    return;
  }

  const bundleDirectories = discoverPolicyBundleDirectories(this, resolvedDir);
  if (bundleDirectories.length === 0) {
    const empty: PolicyCheckResult = {
      version: POLICY_CHECK_RESULT_VERSION,
      status: 'failed',
      directory: resolvedDir,
      fix,
      tools: { opa: null, regal: null },
      checks: POLICY_CHECK_STEP_NAMES.map((name) => ({
        name,
        status: name === 'manifest' ? 'failed' : 'skipped',
      })),
      unformattedFiles: [],
      fixedFiles: [],
      diagnostics: [
        {
          code: 'project.bundles',
          severity: 'error',
          message:
            'No publishable policy bundles found. Add one with `transcend policy new`, ' +
            'or pass a directory that contains a `.manifest`.',
          path: path.relative(this.process.cwd(), resolvedDir) || '.',
        },
      ],
    };
    if (json) {
      this.process.stdout.write(`${JSON.stringify(empty)}\n`);
    } else {
      renderResult(this, empty);
    }
    this.process.exitCode = 1;
    return;
  }

  const results: PolicyCheckResult[] = [];
  for (const bundleDirectory of bundleDirectories) {
    results.push(
      await checkBundle.call(this, { fix, noInteractive, json }, bundleDirectory, runner),
    );
  }

  const failed = results.some((result) => result.status === 'failed');
  if (json) {
    if (results.length === 1) {
      this.process.stdout.write(`${JSON.stringify(results[0])}\n`);
    } else {
      const multi: PolicyCheckMultiResult = {
        version: POLICY_CHECK_MULTI_RESULT_VERSION,
        status: failed ? 'failed' : 'passed',
        directory: resolvedDir,
        fix,
        results,
      };
      this.process.stdout.write(`${JSON.stringify(multi)}\n`);
    }
  } else if (results.length === 1) {
    renderResult(this, results[0]!);
  } else {
    results.forEach((result, index) => {
      if (index > 0) {
        this.logger.info('');
      }
      const relative = path.relative(this.process.cwd(), result.directory) || result.directory;
      renderResult(this, result, `Policy verification — ${relative}`);
    });
  }

  if (failed) {
    this.process.exitCode = 1;
  }
}

import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  runCapturedProcess,
  type CapturedProcessRunner,
} from '../../../lib/cli/run-captured-process.js';
import {
  type PolicyLintDiagnostic,
  type PolicyLintMultiResult,
  type PolicyLintResult,
  type PolicyLintStep,
  POLICY_LINT_MULTI_RESULT_VERSION,
  POLICY_LINT_RESULT_VERSION,
  POLICY_LINT_STEP_LABELS,
  POLICY_LINT_STEP_NAMES,
} from '../../../lib/policy/policy-lint-model.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyBundleDirectories,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import { probePolicyToolVersions } from '../helpers/probePolicyToolVersions.js';
import { runOpaFormatStep } from '../helpers/runOpaFormatStep.js';
import { runRegalLintStep } from '../helpers/runRegalLintStep.js';

/** CLI flags for `transcend policy lint`. */
export interface LintCommandFlags {
  /** Apply OPA formatting. */
  fix: boolean;
  /** Disable the optional formatting confirmation. */
  noInteractive: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/**
 * Render the terminal summary for a policy lint result.
 *
 * @param context - CLI context
 * @param result - Completed lint result
 * @param heading - Optional section heading when linting multiple bundles
 */
function renderResult(context: LocalContext, result: PolicyLintResult, heading?: string): void {
  if (heading) {
    context.logger.info(`${colors.bold(heading)}\n`);
  } else {
    context.logger.info(`${colors.bold('Policy lint')}\n`);
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
    context.logger.info(`${styledLabel} ${POLICY_LINT_STEP_LABELS[name]}${version}`);
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
    context.logger.info(colors.green('Policy lint passed.'));
  } else {
    context.logger.error('');
    context.logger.error(colors.red('Policy lint failed.'));
  }
}

/**
 * Lint one publishable policy bundle directory (format + Regal).
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param resolvedDir - Absolute bundle directory
 * @param runner - Captured subprocess runner
 * @returns Completed lint result
 */
async function lintBundle(
  this: LocalContext,
  { fix, noInteractive, json }: LintCommandFlags,
  resolvedDir: string,
  runner: CapturedProcessRunner,
): Promise<PolicyLintResult> {
  const checks: PolicyLintStep[] = POLICY_LINT_STEP_NAMES.map((name) => ({
    name,
    status: 'skipped',
  }));
  const diagnostics: PolicyLintDiagnostic[] = [];
  const result: PolicyLintResult = {
    version: POLICY_LINT_RESULT_VERSION,
    status: 'passed',
    directory: resolvedDir,
    fix,
    tools: { opa: null, regal: null },
    checks,
    unformattedFiles: [],
    fixedFiles: [],
    diagnostics,
  };
  const setStatus = (name: PolicyLintStep['name'], status: PolicyLintStep['status']): void => {
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
    setStatus('opa-version', 'failed');
    addError(
      'project.directory',
      `Policy directory does not exist or is not a directory: ${resolvedDir}`,
      path.relative(this.process.cwd(), resolvedDir),
    );
    result.status = 'failed';
    return result;
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
      fixCommandHint: 'transcend policy lint --fix',
      runner,
    });
    result.unformattedFiles = formatStep.unformattedFiles;
    result.fixedFiles = formatStep.fixedFiles;
    setStatus('format', formatStep.status);
    formatStep.diagnostics.forEach((diagnostic) => {
      addError(diagnostic.code, diagnostic.message);
    });
  }

  if (result.tools.regal) {
    const regalStep = await runRegalLintStep.call(this, { resolvedDir, runner });
    setStatus('regal-lint', regalStep.status);
    regalStep.diagnostics.forEach((diagnostic) => {
      addError(diagnostic.code, diagnostic.message);
    });
  }

  result.status = checks.some(({ status }) => status === 'failed') ? 'failed' : 'passed';
  return result;
}

/**
 * Lint local policy bundles with OPA formatting and Regal.
 *
 * With no directory (or the default workspace path), discovers every immediate
 * child that contains a `.manifest` and lints each. Pass one bundle path to
 * lint a single publishable unit.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param directory - Policy workspace or bundle directory
 * @param runner - Captured subprocess runner
 */
export async function lint(
  this: LocalContext,
  flags: LintCommandFlags,
  directory: string = DEFAULT_POLICY_PROJECT_DIRECTORY,
  runner: CapturedProcessRunner = runCapturedProcess,
): Promise<void> {
  doneInputValidation(this.process);

  const { fix = false, noInteractive = false, json = false } = flags;
  const resolvedDir = resolvePolicyProjectDirectory(this.process.cwd(), directory);

  if (!this.fs.existsSync(resolvedDir) || !this.fs.statSync(resolvedDir).isDirectory()) {
    const missing: PolicyLintResult = {
      version: POLICY_LINT_RESULT_VERSION,
      status: 'failed',
      directory: resolvedDir,
      fix,
      tools: { opa: null, regal: null },
      checks: POLICY_LINT_STEP_NAMES.map((name) => ({
        name,
        status: name === 'opa-version' ? 'failed' : 'skipped',
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
    const empty: PolicyLintResult = {
      version: POLICY_LINT_RESULT_VERSION,
      status: 'failed',
      directory: resolvedDir,
      fix,
      tools: { opa: null, regal: null },
      checks: POLICY_LINT_STEP_NAMES.map((name) => ({
        name,
        status: name === 'opa-version' ? 'failed' : 'skipped',
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

  const results: PolicyLintResult[] = [];
  for (const bundleDirectory of bundleDirectories) {
    results.push(
      await lintBundle.call(this, { fix, noInteractive, json }, bundleDirectory, runner),
    );
  }

  const failed = results.some((result) => result.status === 'failed');
  if (json) {
    if (results.length === 1) {
      this.process.stdout.write(`${JSON.stringify(results[0])}\n`);
    } else {
      const multi: PolicyLintMultiResult = {
        version: POLICY_LINT_MULTI_RESULT_VERSION,
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
      renderResult(this, result, `Policy lint — ${relative}`);
    });
  }

  if (failed) {
    this.process.exitCode = 1;
  }
}

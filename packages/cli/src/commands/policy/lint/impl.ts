import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  runCapturedProcess,
  type CapturedProcessRunner,
} from '../../../lib/cli/run-captured-process.js';
import { inquirerConfirmBoolean } from '../../../lib/helpers/inquirer.js';
import {
  type PolicyBundleRegoFile,
  validatePolicyBundleContents,
} from '../../../lib/policy/policy-bundle-manifest.js';
import {
  type PolicyLintCheck,
  type PolicyLintDiagnostic,
  type PolicyLintMultiResult,
  type PolicyLintResult,
  POLICY_LINT_CHECK_LABELS,
  POLICY_LINT_CHECK_NAMES,
  POLICY_LINT_MULTI_RESULT_VERSION,
  POLICY_LINT_RESULT_VERSION,
} from '../../../lib/policy/policy-lint-model.js';
import {
  getPolicyProcessFailureMessage,
  parseUnformattedPolicyFiles,
} from '../../../lib/policy/policy-lint-output.js';
import {
  DEFAULT_POLICY_PROJECT_DIRECTORY,
  discoverPolicyBundleDirectories,
  resolvePolicyProjectDirectory,
} from '../../../lib/policy/policy-project-discovery.js';
import {
  OPA_MISSING_MESSAGE,
  parsePolicyToolVersion,
  REGAL_MISSING_MESSAGE,
  unsupportedOpaVersionMessage,
  unsupportedRegalVersionMessage,
} from '../../../lib/policy/policy-runtime.js';
import { POLICY_MANIFEST_FILENAME } from '../../../lib/policy/policy-scaffold-templates.js';
import { isInteractivePromptInvocation } from '../../../lib/scaffolding/prompts.js';

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
 * Collect Rego source snapshots without following symlinks.
 *
 * @param context - CLI context
 * @param projectDirectory - Absolute policy directory
 * @param currentDirectory - Current recursive directory
 * @returns Deterministically ordered Rego snapshots
 */
function collectRegoFiles(
  context: LocalContext,
  projectDirectory: string,
  currentDirectory: string = projectDirectory,
): PolicyBundleRegoFile[] {
  return context.fs
    .readdirSync(currentDirectory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        return collectRegoFiles(context, projectDirectory, absolutePath);
      }
      if (!entry.isFile() || !entry.name.endsWith('.rego')) {
        return [];
      }
      return [
        {
          path: path.relative(projectDirectory, absolutePath).split(path.sep).join('/'),
          contents: context.fs.readFileSync(absolutePath, 'utf8'),
        },
      ];
    });
}

/**
 * Resolve a Regal config file for a bundle, walking up to the workspace.
 *
 * @param context - CLI context
 * @param bundleDirectory - Absolute bundle directory
 * @returns Absolute config path, or undefined when none is found
 */
function resolveRegalConfigFile(
  context: LocalContext,
  bundleDirectory: string,
): string | undefined {
  let current = bundleDirectory;
  for (;;) {
    const nestedRegalConfig = path.join(current, '.regal', 'config.yaml');
    if (context.fs.existsSync(nestedRegalConfig)) {
      return nestedRegalConfig;
    }
    const rootRegalConfig = path.join(current, '.regal.yaml');
    if (context.fs.existsSync(rootRegalConfig)) {
      return rootRegalConfig;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

/**
 * Render the terminal summary for a policy verification result.
 *
 * @param context - CLI context
 * @param result - Completed verification result
 * @param heading - Optional section heading when linting multiple bundles
 */
function renderResult(context: LocalContext, result: PolicyLintResult, heading?: string): void {
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
    context.logger.info(`${styledLabel} ${POLICY_LINT_CHECK_LABELS[name]}${version}`);
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
 * @param context - CLI context
 * @param flags - Command flags
 * @param resolvedDir - Absolute bundle directory
 * @param runner - Captured subprocess runner
 * @returns Completed verification result
 */
async function lintBundle(
  this: LocalContext,
  { fix, noInteractive, json }: LintCommandFlags,
  resolvedDir: string,
  runner: CapturedProcessRunner,
): Promise<PolicyLintResult> {
  const checks: PolicyLintCheck[] = POLICY_LINT_CHECK_NAMES.map((name) => ({
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
  const setStatus = (name: PolicyLintCheck['name'], status: PolicyLintCheck['status']): void => {
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
      collectRegoFiles(this, resolvedDir),
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

  const opaVersionResult = await runner('opa', ['version'], { cwd: resolvedDir }, this);
  if (opaVersionResult.error?.code === 'ENOENT') {
    setStatus('opa-version', 'failed');
    addError('opa.missing', OPA_MISSING_MESSAGE);
  } else {
    const opaVersionOutput = `${opaVersionResult.stdout}\n${opaVersionResult.stderr}`;
    const unsupportedOpa = unsupportedOpaVersionMessage(opaVersionOutput);
    if (opaVersionResult.code !== 0 || unsupportedOpa) {
      setStatus('opa-version', 'failed');
      addError(
        'opa.version',
        unsupportedOpa ??
          getPolicyProcessFailureMessage(
            opaVersionResult,
            'Unable to determine the installed OPA version.',
          ),
      );
    } else {
      result.tools.opa = parsePolicyToolVersion(opaVersionOutput)!.version;
      setStatus('opa-version', 'passed');
    }
  }

  const regalVersionResult = await runner('regal', ['version'], { cwd: resolvedDir }, this);
  if (regalVersionResult.error?.code === 'ENOENT') {
    setStatus('regal-version', 'failed');
    addError('regal.missing', REGAL_MISSING_MESSAGE);
  } else {
    const regalVersionOutput = `${regalVersionResult.stdout}\n${regalVersionResult.stderr}`;
    const unsupportedRegal = unsupportedRegalVersionMessage(regalVersionOutput);
    if (regalVersionResult.code !== 0 || unsupportedRegal) {
      setStatus('regal-version', 'failed');
      addError(
        'regal.version',
        unsupportedRegal ??
          getPolicyProcessFailureMessage(
            regalVersionResult,
            'Unable to determine the installed Regal version.',
          ),
      );
    } else {
      result.tools.regal = parsePolicyToolVersion(regalVersionOutput)!.version;
      setStatus('regal-version', 'passed');
    }
  }

  if (result.tools.opa) {
    const formatResult = await runner(
      'opa',
      ['fmt', '--list', resolvedDir],
      { cwd: resolvedDir },
      this,
    );
    if (formatResult.code !== 0) {
      setStatus('format', 'failed');
      addError(
        'opa.format',
        getPolicyProcessFailureMessage(
          formatResult,
          `opa fmt --list failed with exit code ${formatResult.code}`,
        ),
      );
    } else {
      result.unformattedFiles = parseUnformattedPolicyFiles(formatResult.stdout, resolvedDir);
      if (result.unformattedFiles.length === 0) {
        setStatus('format', 'passed');
      } else {
        let shouldFormat = fix;
        const interactive = isInteractivePromptInvocation(
          { json, noInteractive },
          this.process.stdin.isTTY,
          this.process.stderr.isTTY,
        );
        if (!json && !fix) {
          this.logger.error(colors.red('Policy files are not formatted:'));
          result.unformattedFiles.forEach((file) => {
            this.logger.error(colors.red(`  - ${file}`));
          });
          const diffResult = await runner(
            'opa',
            ['fmt', '--diff', resolvedDir],
            { cwd: resolvedDir },
            this,
          );
          const diff = diffResult.stdout.trim() || diffResult.stderr.trim();
          if (diff) {
            this.logger.error('');
            this.logger.error(diff);
          }
        }
        if (!fix && interactive) {
          try {
            shouldFormat = await inquirerConfirmBoolean({
              message: 'Format the unformatted policy files listed above?',
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (/force closed|prompt.*cancel|user.*close|SIGINT/iu.test(message)) {
              this.process.exit(130);
            }
            throw error;
          }
        }
        if (shouldFormat) {
          const writeResult = await runner(
            'opa',
            ['fmt', '--write', resolvedDir],
            { cwd: resolvedDir },
            this,
          );
          if (writeResult.code === 0) {
            result.fixedFiles = [...result.unformattedFiles];
            setStatus('format', 'passed');
          } else {
            setStatus('format', 'failed');
            addError(
              'opa.format-fix',
              getPolicyProcessFailureMessage(
                writeResult,
                `opa fmt --write failed with exit code ${writeResult.code}`,
              ),
            );
          }
        } else {
          setStatus('format', 'failed');
          addError(
            'opa.format-required',
            'Policy files are not formatted. Re-run `transcend policy lint --fix` to repair them.',
          );
        }
      }
    }

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
    const regalConfig = resolveRegalConfigFile(this, resolvedDir);
    const regalResult = await runner(
      'regal',
      [
        'lint',
        '--fail-level',
        'warning',
        ...(regalConfig ? ['--config-file', regalConfig] : []),
        resolvedDir,
      ],
      { cwd: resolvedDir },
      this,
    );
    if (regalResult.code === 0) {
      setStatus('regal-lint', 'passed');
    } else {
      setStatus('regal-lint', 'failed');
      addError(
        'regal.lint',
        getPolicyProcessFailureMessage(
          regalResult,
          `regal lint failed with exit code ${regalResult.code}`,
        ),
      );
    }
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
      checks: POLICY_LINT_CHECK_NAMES.map((name) => ({
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
    const empty: PolicyLintResult = {
      version: POLICY_LINT_RESULT_VERSION,
      status: 'failed',
      directory: resolvedDir,
      fix,
      tools: { opa: null, regal: null },
      checks: POLICY_LINT_CHECK_NAMES.map((name) => ({
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
      renderResult(this, result, `Policy verification — ${relative}`);
    });
  }

  if (failed) {
    this.process.exitCode = 1;
  }
}

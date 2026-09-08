import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  runCapturedProcess,
  type CapturedProcessResult,
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
  type PolicyLintResult,
  POLICY_LINT_RESULT_VERSION,
} from '../../../lib/policy/policy-lint-model.js';
import {
  OPA_MISSING_MESSAGE,
  parsePolicyToolVersion,
  REGAL_MISSING_MESSAGE,
  unsupportedOpaVersionMessage,
  unsupportedRegalVersionMessage,
} from '../../../lib/policy/policy-runtime.js';

/** CLI flags for `transcend policy lint`. */
export interface LintCommandFlags {
  /** Directory containing manifest.json, Rego policy files, and tests. */
  dir: string;
  /** Apply OPA formatting. */
  fix: boolean;
  /** Disable the optional formatting confirmation. */
  noInteractive: boolean;
  /** Emit one stable JSON result on stdout. */
  json: boolean;
}

/** Stable verification execution order. */
const CHECK_NAMES: PolicyLintCheck['name'][] = [
  'manifest',
  'opa-version',
  'regal-version',
  'format',
  'opa-check',
  'regal-lint',
  'opa-test',
];

/** User-facing verification labels. */
const CHECK_LABELS: Readonly<Record<PolicyLintCheck['name'], string>> = {
  manifest: 'Manifest and package roots',
  'opa-version': 'OPA 1.x',
  'regal-version': 'Regal',
  format: 'OPA formatting',
  'opa-check': 'OPA strict check',
  'regal-lint': 'Regal lint',
  'opa-test': 'OPA tests',
};

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
 * Use captured tool output as a concise diagnostic.
 *
 * @param result - Captured process result
 * @param fallback - Message used when the tool emitted no output
 * @returns Diagnostic message
 */
function processFailureMessage(result: CapturedProcessResult, fallback: string): string {
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  return output || fallback;
}

/**
 * Convert absolute OPA formatter paths to stable project-relative paths.
 *
 * @param stdout - `opa fmt --list` output
 * @param projectDirectory - Absolute policy directory
 * @returns Sorted unique paths
 */
function parseUnformattedFiles(stdout: string, projectDirectory: string): string[] {
  return [
    ...new Set(
      stdout
        .split(/\r?\n/gu)
        .map((file) => file.trim())
        .filter(Boolean)
        .map((file) =>
          path.isAbsolute(file)
            ? path.relative(projectDirectory, file).split(path.sep).join('/')
            : file.split(path.sep).join('/'),
        ),
    ),
  ].sort();
}

/**
 * Render the terminal summary for a policy verification result.
 *
 * @param context - CLI context
 * @param result - Completed verification result
 */
function renderResult(context: LocalContext, result: PolicyLintResult): void {
  context.logger.info(`${colors.bold('Policy verification')}\n`);
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
    context.logger.info(`${styledLabel} ${CHECK_LABELS[name]}${version}`);
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
 * Verify a local policy project with the shared upload contract, OPA, and Regal.
 *
 * @param this - CLI context
 * @param flags - Command flags
 * @param runner - Captured subprocess runner
 */
export async function lint(
  this: LocalContext,
  { dir = 'transcend/policy', fix = false, noInteractive = false, json = false }: LintCommandFlags,
  runner: CapturedProcessRunner = runCapturedProcess,
): Promise<void> {
  doneInputValidation(this.process);

  const resolvedDir = path.resolve(this.process.cwd(), dir);
  const checks: PolicyLintCheck[] = CHECK_NAMES.map((name) => ({ name, status: 'skipped' }));
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
  } else {
    const manifestPath = path.join(resolvedDir, 'manifest.json');
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
            processFailureMessage(
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
            processFailureMessage(
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
          processFailureMessage(
            formatResult,
            `opa fmt --list failed with exit code ${formatResult.code}`,
          ),
        );
      } else {
        result.unformattedFiles = parseUnformattedFiles(formatResult.stdout, resolvedDir);
        if (result.unformattedFiles.length === 0) {
          setStatus('format', 'passed');
        } else {
          let shouldFormat = fix;
          const interactive = !json && !noInteractive && Boolean(this.process.stdin.isTTY);
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
                processFailureMessage(
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
        ['check', '--strict', '--v0-compatible', resolvedDir],
        { cwd: resolvedDir },
        this,
      );
      if (checkResult.code === 0) {
        setStatus('opa-check', 'passed');
      } else {
        setStatus('opa-check', 'failed');
        addError(
          'opa.check',
          processFailureMessage(checkResult, `opa check failed with exit code ${checkResult.code}`),
        );
      }
    }

    if (result.tools.regal) {
      const nestedRegalConfig = path.join(resolvedDir, '.regal', 'config.yaml');
      const rootRegalConfig = path.join(resolvedDir, '.regal.yaml');
      const regalConfig = this.fs.existsSync(nestedRegalConfig)
        ? nestedRegalConfig
        : this.fs.existsSync(rootRegalConfig)
          ? rootRegalConfig
          : undefined;
      const regalResult = await runner(
        'regal',
        ['lint', ...(regalConfig ? ['--config-file', regalConfig] : []), resolvedDir],
        { cwd: resolvedDir },
        this,
      );
      if (regalResult.code === 0) {
        setStatus('regal-lint', 'passed');
      } else {
        setStatus('regal-lint', 'failed');
        addError(
          'regal.lint',
          processFailureMessage(
            regalResult,
            `regal lint failed with exit code ${regalResult.code}`,
          ),
        );
      }
    }

    if (result.tools.opa) {
      const testResult = await runner(
        'opa',
        ['test', '--fail-on-empty', resolvedDir],
        { cwd: resolvedDir },
        this,
      );
      if (testResult.code === 0) {
        setStatus('opa-test', 'passed');
      } else {
        setStatus('opa-test', 'failed');
        addError(
          'opa.test',
          processFailureMessage(
            testResult,
            `opa test --fail-on-empty failed with exit code ${testResult.code}`,
          ),
        );
      }
    }
  }

  result.status = checks.some(({ status }) => status === 'failed') ? 'failed' : 'passed';
  if (json) {
    this.process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    renderResult(this, result);
  }
  if (result.status === 'failed') {
    this.process.exitCode = 1;
  }
}

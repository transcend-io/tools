import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import type { CapturedProcessRunner } from '../../../lib/cli/run-captured-process.js';
import { inquirerConfirmBoolean } from '../../../lib/helpers/inquirer.js';
import {
  getPolicyProcessFailureMessage,
  parseUnformattedPolicyFiles,
} from '../../../lib/policy/policy-process-output.js';
import { isInteractivePromptInvocation } from '../../../lib/scaffolding/prompts.js';

/** Inputs for the shared OPA formatting step. */
export interface RunOpaFormatStepInput {
  /** Absolute policy bundle directory. */
  resolvedDir: string;
  /** Apply OPA formatting without prompting. */
  fix: boolean;
  /** Disable the optional formatting confirmation. */
  noInteractive: boolean;
  /** Whether the command is emitting JSON. */
  json: boolean;
  /**
   * CLI invocation users should re-run with `--fix`.
   *
   * Example: `transcend policy lint --fix`
   */
  fixCommandHint: string;
  /** Captured subprocess runner. */
  runner: CapturedProcessRunner;
}

/** Outcome of the shared OPA formatting step. */
export interface RunOpaFormatStepResult {
  /** Step status. */
  status: 'passed' | 'failed';
  /** Files found to need OPA formatting, relative to the policy directory. */
  unformattedFiles: string[];
  /** Files repaired with OPA formatting, relative to the policy directory. */
  fixedFiles: string[];
  /** Diagnostics produced by this step. */
  diagnostics: Array<{
    /** Stable diagnostic identifier. */
    code: string;
    /** Human-readable detail. */
    message: string;
  }>;
}

/**
 * Check or repair OPA formatting for one policy bundle directory.
 *
 * @param this - CLI context
 * @param input - Format step inputs
 * @returns Format step outcome
 */
export async function runOpaFormatStep(
  this: LocalContext,
  { resolvedDir, fix, noInteractive, json, fixCommandHint, runner }: RunOpaFormatStepInput,
): Promise<RunOpaFormatStepResult> {
  const formatResult = await runner(
    'opa',
    ['fmt', '--list', resolvedDir],
    { cwd: resolvedDir },
    this,
  );
  if (formatResult.code !== 0) {
    return {
      status: 'failed',
      unformattedFiles: [],
      fixedFiles: [],
      diagnostics: [
        {
          code: 'opa.format',
          message: getPolicyProcessFailureMessage(
            formatResult,
            `opa fmt --list failed with exit code ${formatResult.code}`,
          ),
        },
      ],
    };
  }

  const unformattedFiles = parseUnformattedPolicyFiles(formatResult.stdout, resolvedDir);
  if (unformattedFiles.length === 0) {
    return {
      status: 'passed',
      unformattedFiles: [],
      fixedFiles: [],
      diagnostics: [],
    };
  }

  let shouldFormat = fix;
  const interactive = isInteractivePromptInvocation(
    { json, noInteractive },
    this.process.stdin.isTTY,
    this.process.stderr.isTTY,
  );
  if (!json && !fix) {
    this.logger.error(colors.red('Policy files are not formatted:'));
    unformattedFiles.forEach((file) => {
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
      return {
        status: 'passed',
        unformattedFiles,
        fixedFiles: [...unformattedFiles],
        diagnostics: [],
      };
    }
    return {
      status: 'failed',
      unformattedFiles,
      fixedFiles: [],
      diagnostics: [
        {
          code: 'opa.format-fix',
          message: getPolicyProcessFailureMessage(
            writeResult,
            `opa fmt --write failed with exit code ${writeResult.code}`,
          ),
        },
      ],
    };
  }

  return {
    status: 'failed',
    unformattedFiles,
    fixedFiles: [],
    diagnostics: [
      {
        code: 'opa.format-required',
        message: `Policy files are not formatted. Re-run \`${fixCommandHint}\` to repair them.`,
      },
    ],
  };
}

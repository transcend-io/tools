import type { LocalContext } from '../../../context.js';
import type { CapturedProcessRunner } from '../../../lib/cli/run-captured-process.js';
import { getPolicyProcessFailureMessage } from '../../../lib/policy/policy-process-output.js';
import { resolveRegalConfigFile } from './resolveRegalConfigFile.js';

/** Inputs for the shared Regal lint step. */
export interface RunRegalLintStepInput {
  /** Absolute policy bundle directory. */
  resolvedDir: string;
  /** Captured subprocess runner. */
  runner: CapturedProcessRunner;
}

/** Outcome of the shared Regal lint step. */
export interface RunRegalLintStepResult {
  /** Step status. */
  status: 'passed' | 'failed';
  /** Diagnostics produced by this step. */
  diagnostics: Array<{
    /** Stable diagnostic identifier. */
    code: string;
    /** Human-readable detail. */
    message: string;
  }>;
}

/**
 * Run Regal lint with warnings treated as failures.
 *
 * @param this - CLI context
 * @param input - Regal lint step inputs
 * @returns Regal lint step outcome
 */
export async function runRegalLintStep(
  this: LocalContext,
  { resolvedDir, runner }: RunRegalLintStepInput,
): Promise<RunRegalLintStepResult> {
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
    return { status: 'passed', diagnostics: [] };
  }
  return {
    status: 'failed',
    diagnostics: [
      {
        code: 'regal.lint',
        message: getPolicyProcessFailureMessage(
          regalResult,
          `regal lint failed with exit code ${regalResult.code}`,
        ),
      },
    ],
  };
}

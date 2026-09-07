import type { CUSTOM_FUNCTION_RESULT_VERSION } from './scaffold-model.js';

/** Severity attached to a local check diagnostic. */
export type CustomFunctionDiagnosticSeverity = 'error' | 'warning';

/** A stable file-scoped local validation diagnostic. */
export interface CustomFunctionDiagnostic {
  /** Stable machine-readable diagnostic code. */
  code: string;
  /** Error or warning. */
  severity: CustomFunctionDiagnosticSeverity;
  /** Human-readable explanation. */
  message: string;
  /** File path, relative to the manifest when possible. */
  path?: string;
  /** Manifest entry display name. */
  functionName?: string;
}

/** Status of one local validation check. */
export type CustomFunctionCheckStatus = 'passed' | 'failed' | 'skipped';

/** Summary of one validation category. */
export interface CustomFunctionCheckSummary {
  /** Stable check name. */
  name: string;
  /** Check status. */
  status: CustomFunctionCheckStatus;
}

/** Stable result emitted by `custom-functions check --json`. */
export interface CustomFunctionCheckResult {
  /** JSON contract version. */
  version: typeof CUSTOM_FUNCTION_RESULT_VERSION;
  /** Overall status. */
  status: 'passed' | 'failed';
  /** Absolute manifest path. */
  manifestPath: string;
  /** Checks that ran or were skipped. */
  checks: CustomFunctionCheckSummary[];
  /** File-scoped diagnostics. */
  diagnostics: CustomFunctionDiagnostic[];
}

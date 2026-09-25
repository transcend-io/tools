/** Stable policy lint result schema version. */
export const POLICY_LINT_RESULT_VERSION = 1;

/** Stable multi-bundle lint result schema version. */
export const POLICY_LINT_MULTI_RESULT_VERSION = 1;

/** Status of the lint gate or an individual step. */
export type PolicyLintStatus = 'passed' | 'failed' | 'skipped';

/** One named policy lint step. */
export interface PolicyLintStep {
  /** Stable step name. */
  name: 'opa-version' | 'regal-version' | 'format' | 'regal-lint';
  /** Step outcome. */
  status: PolicyLintStatus;
}

/** Stable lint step execution order. */
export const POLICY_LINT_STEP_NAMES: PolicyLintStep['name'][] = [
  'opa-version',
  'regal-version',
  'format',
  'regal-lint',
];

/** User-facing lint step labels. */
export const POLICY_LINT_STEP_LABELS: Readonly<Record<PolicyLintStep['name'], string>> = {
  'opa-version': 'OPA 1.x',
  'regal-version': 'Regal',
  format: 'OPA formatting',
  'regal-lint': 'Regal lint',
};

/** One machine-readable policy lint diagnostic. */
export interface PolicyLintDiagnostic {
  /** Stable diagnostic identifier. */
  code: string;
  /** Diagnostic severity. */
  severity: 'error';
  /** Human-readable detail, including captured tool output when available. */
  message: string;
  /** Optional path relative to the invocation directory. */
  path?: string;
}

/** Detected local policy tool versions. */
export interface PolicyLintTools {
  /** Detected OPA version, or null when missing or unsupported. */
  opa: string | null;
  /** Detected Regal version, or null when missing or unsupported. */
  regal: string | null;
}

/** Stable result emitted by `transcend policy lint --json` for one bundle. */
export interface PolicyLintResult {
  /** Result schema version. */
  version: typeof POLICY_LINT_RESULT_VERSION;
  /** Overall lint outcome. */
  status: Exclude<PolicyLintStatus, 'skipped'>;
  /** Absolute policy bundle directory. */
  directory: string;
  /** Whether formatting repair was explicitly requested. */
  fix: boolean;
  /** Detected supported tool versions. */
  tools: PolicyLintTools;
  /** Lint step outcomes in stable execution order. */
  checks: PolicyLintStep[];
  /** Files found to need OPA formatting, relative to the policy directory. */
  unformattedFiles: string[];
  /** Files repaired with OPA formatting, relative to the policy directory. */
  fixedFiles: string[];
  /** Ordered lint diagnostics. */
  diagnostics: PolicyLintDiagnostic[];
}

/**
 * Stable result when `transcend policy lint --json` lints multiple bundles.
 *
 * Emitted only when the selected path is a workspace with more than one
 * publishable `*-bundle/` directory.
 */
export interface PolicyLintMultiResult {
  /** Result schema version. */
  version: typeof POLICY_LINT_MULTI_RESULT_VERSION;
  /** Overall lint outcome across all bundles. */
  status: Exclude<PolicyLintStatus, 'skipped'>;
  /** Absolute policy workspace directory that was searched. */
  directory: string;
  /** Whether formatting repair was explicitly requested. */
  fix: boolean;
  /** Per-bundle results in discovery order. */
  results: PolicyLintResult[];
}

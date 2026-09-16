/** Stable policy lint result schema version. */
export const POLICY_LINT_RESULT_VERSION = 1;

/** Stable multi-bundle lint result schema version. */
export const POLICY_LINT_MULTI_RESULT_VERSION = 2;

/** Status of the full gate or an individual verification. */
export type PolicyLintStatus = 'passed' | 'failed' | 'skipped';

/** One named policy verification. */
export interface PolicyLintCheck {
  /** Stable verification name. */
  name:
    | 'manifest'
    | 'opa-version'
    | 'regal-version'
    | 'format'
    | 'opa-check'
    | 'regal-lint'
    | 'opa-test';
  /** Verification outcome. */
  status: PolicyLintStatus;
}

/** Stable verification execution order. */
export const POLICY_LINT_CHECK_NAMES: PolicyLintCheck['name'][] = [
  'manifest',
  'opa-version',
  'regal-version',
  'format',
  'opa-check',
  'regal-lint',
  'opa-test',
];

/** User-facing verification labels. */
export const POLICY_LINT_CHECK_LABELS: Readonly<Record<PolicyLintCheck['name'], string>> = {
  manifest: 'Manifest and package roots',
  'opa-version': 'OPA 1.x',
  'regal-version': 'Regal',
  format: 'OPA formatting',
  'opa-check': 'OPA strict check',
  'regal-lint': 'Regal lint',
  'opa-test': 'OPA tests',
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
  /** Overall verification outcome. */
  status: Exclude<PolicyLintStatus, 'skipped'>;
  /** Absolute policy bundle directory. */
  directory: string;
  /** Whether formatting repair was explicitly requested. */
  fix: boolean;
  /** Detected supported tool versions. */
  tools: PolicyLintTools;
  /** Verification outcomes in stable execution order. */
  checks: PolicyLintCheck[];
  /** Files found to need OPA formatting, relative to the policy directory. */
  unformattedFiles: string[];
  /** Files repaired with OPA formatting, relative to the policy directory. */
  fixedFiles: string[];
  /** Ordered verification diagnostics. */
  diagnostics: PolicyLintDiagnostic[];
}

/**
 * Stable result when `transcend policy lint --json` verifies multiple bundles.
 *
 * Emitted only when the selected path is a workspace with more than one
 * publishable `*-bundle/` directory.
 */
export interface PolicyLintMultiResult {
  /** Result schema version. */
  version: typeof POLICY_LINT_MULTI_RESULT_VERSION;
  /** Overall verification outcome across all bundles. */
  status: Exclude<PolicyLintStatus, 'skipped'>;
  /** Absolute policy workspace directory that was searched. */
  directory: string;
  /** Whether formatting repair was explicitly requested. */
  fix: boolean;
  /** Per-bundle results in discovery order. */
  results: PolicyLintResult[];
}

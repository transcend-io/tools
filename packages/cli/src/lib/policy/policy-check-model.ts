/** Stable policy check result schema version. */
export const POLICY_CHECK_RESULT_VERSION = 1;

/** Stable multi-bundle check result schema version. */
export const POLICY_CHECK_MULTI_RESULT_VERSION = 2;

/** Status of the full gate or an individual verification. */
export type PolicyCheckStatus = 'passed' | 'failed' | 'skipped';

/** One named policy verification. */
export interface PolicyCheckStep {
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
  status: PolicyCheckStatus;
}

/** Stable verification execution order. */
export const POLICY_CHECK_STEP_NAMES: PolicyCheckStep['name'][] = [
  'manifest',
  'opa-version',
  'regal-version',
  'format',
  'opa-check',
  'regal-lint',
  'opa-test',
];

/** User-facing verification labels. */
export const POLICY_CHECK_STEP_LABELS: Readonly<Record<PolicyCheckStep['name'], string>> = {
  manifest: 'Manifest and package roots',
  'opa-version': 'OPA 1.x',
  'regal-version': 'Regal',
  format: 'OPA formatting',
  'opa-check': 'OPA strict check',
  'regal-lint': 'Regal lint',
  'opa-test': 'OPA tests',
};

/** One machine-readable policy check diagnostic. */
export interface PolicyCheckDiagnostic {
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
export interface PolicyCheckTools {
  /** Detected OPA version, or null when missing or unsupported. */
  opa: string | null;
  /** Detected Regal version, or null when missing or unsupported. */
  regal: string | null;
}

/** Stable result emitted by `transcend policy check --json` for one bundle. */
export interface PolicyCheckResult {
  /** Result schema version. */
  version: typeof POLICY_CHECK_RESULT_VERSION;
  /** Overall verification outcome. */
  status: Exclude<PolicyCheckStatus, 'skipped'>;
  /** Absolute policy bundle directory. */
  directory: string;
  /** Whether formatting repair was explicitly requested. */
  fix: boolean;
  /** Detected supported tool versions. */
  tools: PolicyCheckTools;
  /** Verification outcomes in stable execution order. */
  checks: PolicyCheckStep[];
  /** Files found to need OPA formatting, relative to the policy directory. */
  unformattedFiles: string[];
  /** Files repaired with OPA formatting, relative to the policy directory. */
  fixedFiles: string[];
  /** Ordered verification diagnostics. */
  diagnostics: PolicyCheckDiagnostic[];
}

/**
 * Stable result when `transcend policy check --json` verifies multiple bundles.
 *
 * Emitted only when the selected path is a workspace with more than one
 * publishable `*-bundle/` directory.
 */
export interface PolicyCheckMultiResult {
  /** Result schema version. */
  version: typeof POLICY_CHECK_MULTI_RESULT_VERSION;
  /** Overall verification outcome across all bundles. */
  status: Exclude<PolicyCheckStatus, 'skipped'>;
  /** Absolute policy workspace directory that was searched. */
  directory: string;
  /** Whether formatting repair was explicitly requested. */
  fix: boolean;
  /** Per-bundle results in discovery order. */
  results: PolicyCheckResult[];
}

import { createHash } from 'node:crypto';

/** Version of the stable scaffold/check JSON result contract. */
export const CUSTOM_FUNCTION_RESULT_VERSION = 1 as const;

/** Supported Custom Function scaffold templates. */
export const CustomFunctionTemplate = {
  /** General workflow function. */
  General: 'general',
  /** DSR datapoint/default export only. */
  DsrDataPoint: 'dsr-datapoint',
  /** DSR request-enricher export only. */
  DsrEnricher: 'dsr-enricher',
  /** DSR datapoint and request-enricher exports. */
  DsrBoth: 'dsr-both',
} as const;

/** Supported Custom Function scaffold template. */
export type CustomFunctionTemplate =
  (typeof CustomFunctionTemplate)[keyof typeof CustomFunctionTemplate];

/** Optional repository setup presets. */
export const CustomFunctionSetup = {
  /** Do not add optional repository support. */
  None: 'none',
  /** Add the safe defaults. */
  Recommended: 'recommended',
  /** Add every applicable integration. */
  All: 'all',
} as const;

/** Optional repository setup preset. */
export type CustomFunctionSetup = (typeof CustomFunctionSetup)[keyof typeof CustomFunctionSetup];

/** One repository setup capability. */
export const CustomFunctionSetupFeature = {
  /** Deno import map and strict compiler configuration. */
  Deno: 'deno',
  /** Target-scoped editor configuration. */
  Editor: 'editor',
  /** Coding-agent authoring skill. */
  Skill: 'skill',
  /** GitHub Actions check/deploy workflow. */
  Ci: 'ci',
  /** Secret-name documentation and ignore entry. */
  SecretDocs: 'secret-docs',
} as const;

/** One repository setup capability. */
export type CustomFunctionSetupFeature =
  (typeof CustomFunctionSetupFeature)[keyof typeof CustomFunctionSetupFeature];

/** A file observed while collecting repository state. */
export interface ProjectFileSnapshot {
  /** Absolute path. */
  path: string;
  /** Existing UTF-8 contents, or null when absent. */
  contents: string | null;
  /** Existing file mode, when present. */
  mode?: number;
}

/** A planned regular-file create or update. */
export interface PlannedFileChange {
  /** Discriminator. */
  kind: 'file';
  /** Absolute destination path. */
  path: string;
  /** Existing contents expected immediately before apply. */
  before: string | null;
  /** Complete desired contents. */
  after: string;
  /** Human-readable reason. */
  description: string;
  /** Existing file mode to preserve. */
  mode?: number;
  /** Whether an existing destination must always be rejected. */
  createOnly?: boolean;
}

/** A planned project-local symbolic link with a copy fallback. */
export interface PlannedLinkChange {
  /** Discriminator. */
  kind: 'link';
  /** Absolute link path. */
  path: string;
  /** Relative link target. */
  target: string;
  /** Managed contents to copy when links are unavailable. */
  fallbackContents: string;
  /** Human-readable reason. */
  description: string;
}

/** One staged project mutation. */
export type PlannedChange = PlannedFileChange | PlannedLinkChange;

/** A complete, validated scaffold plan. */
export interface CustomFunctionProjectPlan {
  /** JSON contract version. */
  version: typeof CUSTOM_FUNCTION_RESULT_VERSION;
  /** Command that produced the plan. */
  command: 'init' | 'new';
  /** Absolute project target directory. */
  targetDirectory: string;
  /** Absolute manifest path. */
  manifestPath: string;
  /** Ordered staged mutations. */
  changes: PlannedChange[];
  /** Files inspected and deliberately left unchanged. */
  unchanged: string[];
  /** Non-fatal plan warnings. */
  warnings: string[];
  /** Commands shown after a successful apply. */
  nextSteps: string[];
}

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

/**
 * Hash text for changed-since-preview preflight.
 *
 * @param contents - UTF-8 contents
 * @returns SHA-256 digest
 */
export function hashContents(contents: string): string {
  return createHash('sha256').update(contents).digest('hex');
}

/**
 * Stage a file only when its desired content differs.
 *
 * @param input - File change input
 * @returns A file change, or undefined for a no-op
 */
export function planFileChange(input: {
  /** File snapshot. */
  snapshot: ProjectFileSnapshot;
  /** Desired contents. */
  after: string;
  /** Human-readable reason. */
  description: string;
  /** Refuse every existing file. */
  createOnly?: boolean;
}): PlannedFileChange | undefined {
  const { snapshot, after, description, createOnly } = input;
  if (createOnly && snapshot.contents !== null) {
    throw new Error(`Refusing to overwrite existing file: ${snapshot.path}`);
  }
  if (snapshot.contents === after) {
    return undefined;
  }
  return {
    kind: 'file',
    path: snapshot.path,
    before: snapshot.contents,
    after,
    description,
    ...(snapshot.mode === undefined ? {} : { mode: snapshot.mode }),
    ...(createOnly === undefined ? {} : { createOnly }),
  };
}

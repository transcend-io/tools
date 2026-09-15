import { DEFAULT_POLICY_PROJECT_DIRECTORY } from '../../../lib/policy/policy-project-discovery.js';

/**
 * Shared positional Policy workspace directory (`policy init` / `policy new`).
 *
 * The workspace holds shared Regal config, schemas, and one or more bundles.
 */
export const policyWorkspaceDirectoryParameter = {
  brief: 'Policy workspace directory',
  placeholder: 'directory',
  parse: String,
  optional: true as const,
  default: DEFAULT_POLICY_PROJECT_DIRECTORY,
} as const;

/**
 * Positional directory for multi-bundle commands (`policy lint` / `policy test`).
 *
 * Defaults to the policy workspace. When that path has no `.manifest`, the
 * command discovers and runs against every immediate child that contains one.
 * Pass one bundle directory to target a single unit.
 */
export const policyWorkspaceOrBundleDirectoryParameter = {
  brief: 'Policy workspace or bundle directory (workspace runs every .manifest child)',
  placeholder: 'directory',
  parse: String,
  optional: true as const,
  default: DEFAULT_POLICY_PROJECT_DIRECTORY,
} as const;

/**
 * Required positional directory for one-bundle commands (`policy eval` / `publish`).
 *
 * No default — callers must pass an explicit bundle directory with a `.manifest`.
 */
export const policyBundleDirectoryParameter = {
  brief: 'Policy bundle directory containing a .manifest',
  placeholder: 'directory',
  parse: String,
} as const;

/** Shared logical Policy bundle name flag. */
export const policyBundleNameParameter = {
  kind: 'parsed',
  parse: String,
  brief: 'Tenant-unique policy bundle name',
} as const;

/** Shared raw Policy Engine API response flag. */
export const policyJsonParameter = {
  kind: 'boolean',
  brief: 'Print the raw JSON API response',
  default: false,
} as const;

/**
 * Shared `--debug` flag for Policy Engine API commands.
 *
 * @returns Stricli flag definition
 */
export function createPolicyDebugParameter() {
  return {
    kind: 'boolean' as const,
    brief:
      'Include technical error details (underlying API message and stack trace) when a command fails',
    optional: true as const,
  };
}

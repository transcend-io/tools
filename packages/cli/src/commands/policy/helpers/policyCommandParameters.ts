import {
  DEFAULT_POLICY_BUNDLE_DIRECTORY,
  DEFAULT_POLICY_PROJECT_DIRECTORY,
} from '../../../lib/policy/policy-project-discovery.js';
import { createProjectDirectoryParameter } from '../../../lib/scaffolding/command-parameters.js';

/** Shared positional Policy workspace directory (`policy init`). */
export const policyWorkspaceDirectoryParameter = createProjectDirectoryParameter({
  projectName: 'Policy',
  defaultDirectory: DEFAULT_POLICY_PROJECT_DIRECTORY,
});

/**
 * Shared positional local Policy publish directory (test / eval / publish).
 *
 * Defaults to the generic starter bundle path; pass another `{root}-bundle/`
 * explicitly when needed.
 */
export const policyDirectoryParameter = createProjectDirectoryParameter({
  projectName: 'Policy',
  defaultDirectory: DEFAULT_POLICY_BUNDLE_DIRECTORY,
});

/**
 * Positional directory for `policy lint`.
 *
 * Defaults to the multi-bundle workspace. When that path has no `.manifest`,
 * lint discovers and verifies every immediate child that contains a `.manifest`.
 */
export const policyLintDirectoryParameter = createProjectDirectoryParameter({
  projectName: 'Policy',
  defaultDirectory: DEFAULT_POLICY_PROJECT_DIRECTORY,
});

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

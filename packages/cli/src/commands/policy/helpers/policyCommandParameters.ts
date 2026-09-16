import type { TypedFlagParameter, TypedPositionalParameter } from '@stricli/core';

import type { LocalContext } from '../../../context.js';
import { DEFAULT_POLICY_PROJECT_DIRECTORY } from '../../../lib/policy/policy-project-discovery.js';

/**
 * Shared positional Policy workspace directory (`policy init` / `policy new`).
 *
 * The workspace holds shared Regal config, schemas, and one or more bundles.
 */
export const policyWorkspaceDirectoryParameter = {
  brief: 'Policy workspace directory',
  placeholder: 'workspace',
  parse: String,
  optional: true,
  default: DEFAULT_POLICY_PROJECT_DIRECTORY,
} as const satisfies TypedPositionalParameter<string | undefined, LocalContext>;

/**
 * Positional directory for multi-bundle commands (`policy lint` / `policy test`).
 *
 * Defaults to the policy workspace. When that path has no `.manifest`, the
 * command discovers and runs against every immediate child that contains one.
 * Pass one bundle path to target a single unit.
 */
export const policyWorkspaceOrBundleDirectoryParameter = {
  brief: 'Policy workspace or bundle directory (workspace runs every .manifest child)',
  placeholder: 'workspace|bundle',
  parse: String,
  optional: true,
  default: DEFAULT_POLICY_PROJECT_DIRECTORY,
} as const satisfies TypedPositionalParameter<string | undefined, LocalContext>;

/**
 * Required positional directory for one-bundle commands (`policy eval` / `publish`).
 *
 * No default — callers must pass an explicit bundle directory with a `.manifest`.
 * This is the local publish path (e.g. `transcend/policy/my-bundle`), not the
 * remote Policy Engine `--remote-bundle-name`.
 */
export const policyBundleDirectoryParameter = {
  brief: 'Local policy bundle directory containing a .manifest',
  placeholder: 'bundle',
  parse: String,
} as const satisfies TypedPositionalParameter<string, LocalContext>;

/**
 * Shared remote Policy Engine bundle name flag (`policy publish` / activate /
 * deactivate / download / versions).
 *
 * This is the remote resource name in Transcend — not the local publish folder
 * (`--bundle-dir` / `{name}-bundle/`) and not the Rego package root (`--name`).
 */
export const policyRemoteBundleNameParameter = {
  kind: 'parsed',
  parse: String,
  brief: 'Remote Policy Engine bundle name (not the local folder or --name root)',
} as const satisfies TypedFlagParameter<string, LocalContext>;

/** Shared raw Policy Engine API response flag. */
export const policyJsonParameter = {
  kind: 'boolean',
  brief: 'Print the raw JSON API response',
  default: false,
} as const satisfies TypedFlagParameter<boolean, LocalContext>;

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
  } satisfies TypedFlagParameter<boolean | undefined, LocalContext>;
}

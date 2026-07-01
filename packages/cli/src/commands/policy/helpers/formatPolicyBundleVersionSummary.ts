import type { PolicyBundleVersion } from '../types.js';

/**
 * Formats a policy bundle version for human-readable CLI output.
 *
 * @param version - Version record from the API
 * @returns Summary lines
 */
export function formatPolicyBundleVersionSummary(version: PolicyBundleVersion): string {
  return [
    `id          ${version.id}`,
    `version     ${version.version}`,
    `createdAt   ${version.createdAt}`,
    `activatedAt ${version.activatedAt ?? '-'}`,
  ].join('\n');
}

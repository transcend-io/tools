import type { Got } from 'got';

import type { PolicyBundleVersion, PolicyBundleVersionListResponse } from '../types.js';
import { policyEngineRequest } from './formatPolicyEngineRequestError.js';

/** Options for resolving a policy bundle version. */
export interface ResolvePolicyBundleVersionOptions {
  /** Caller-supplied version label; omitted to pick the latest by createdAt */
  version?: string;
}

/**
 * Lists all versions for a bundle, following cursor pagination.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @returns All uploaded versions
 */
async function listAllPolicyBundleVersions(
  client: Got,
  bundleId: string,
): Promise<PolicyBundleVersion[]> {
  const limit = 100;
  const versions: PolicyBundleVersion[] = [];
  let after: string | undefined;

  while (true) {
    const searchParams: Record<string, string | number> = { limit };
    if (after) {
      searchParams.after = after;
    }

    const body = await policyEngineRequest(
      client
        .get(`v1/policy-engine/policy-bundles/${bundleId}/versions`, {
          searchParams,
        })
        .json<PolicyBundleVersionListResponse>(),
    );

    versions.push(...body.nodes);

    if (!body.pageInfo.hasNextPage || !body.pageInfo.endCursor) {
      break;
    }
    after = body.pageInfo.endCursor;
  }

  return versions;
}

/**
 * Compares two version records by createdAt, newest first.
 *
 * @param left - First version
 * @param right - Second version
 * @returns Sort order for descending createdAt
 */
function compareVersionsByCreatedAtDesc(
  left: PolicyBundleVersion,
  right: PolicyBundleVersion,
): number {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

/**
 * Resolves a version label to a version record, or picks the latest by createdAt.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @param options - Version lookup options
 * @returns Matching or latest version record
 */
export async function resolvePolicyBundleVersion(
  client: Got,
  bundleId: string,
  options: ResolvePolicyBundleVersionOptions,
): Promise<PolicyBundleVersion> {
  const versions = await listAllPolicyBundleVersions(client, bundleId);

  if (versions.length === 0) {
    throw new Error('No versions found for this policy bundle.');
  }

  if (options.version) {
    const match = versions.find((entry) => entry.version === options.version);
    if (!match) {
      throw new Error(`Version "${options.version}" was not found for this policy bundle.`);
    }
    return match;
  }

  return versions.sort(compareVersionsByCreatedAtDesc)[0];
}

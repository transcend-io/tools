import type { Got } from 'got';

import {
  policyEngineRequest,
  throwPolicyEngineRequestError,
} from './formatPolicyEngineRequestError.js';
import type {
  GetPolicyBundleVersionResponse,
  PolicyBundle,
  PolicyBundleListResponse,
  PolicyBundleVersionListResponse,
} from './types.js';

/**
 * Policy Engine operations aligned with `transcend policy` CLI commands.
 *
 * These follow the same REST paths and resolution logic as the CLI so MCP
 * behavior matches what customers run locally (per Policy Engine team review).
 */

/**
 * Lists policy bundles (mirrors `transcend policy bundles --json`).
 *
 * @param client - Policy Engine REST client
 * @param options - Pagination options
 * @returns Bundle list response
 */
export async function listPolicyBundles(
  client: Got,
  options: { limit?: number; offset?: number } = {},
): Promise<PolicyBundleListResponse> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  return policyEngineRequest(
    client
      .get('v1/policy-engine/policy-bundles', {
        searchParams: { limit, offset },
      })
      .json<PolicyBundleListResponse>(),
  );
}

/**
 * Fetches a policy bundle parent record by UUID.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Bundle UUID
 * @returns Matching bundle when found
 */
export async function getPolicyBundleById(
  client: Got,
  bundleId: string,
): Promise<PolicyBundle | undefined> {
  try {
    return await client.get(`v1/policy-engine/policy-bundles/${bundleId}`).json<PolicyBundle>();
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { statusCode?: number } }).response?.statusCode === 404
    ) {
      return undefined;
    }
    throwPolicyEngineRequestError(error);
  }
}

/**
 * Lists versions for a bundle (mirrors `transcend policy versions --json`).
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @param options - Cursor pagination options
 * @returns Version list response
 */
export async function listPolicyBundleVersions(
  client: Got,
  bundleId: string,
  options: { limit?: number; after?: string; version?: string } = {},
): Promise<PolicyBundleVersionListResponse> {
  const limit = options.limit ?? 50;
  const searchParams: Record<string, string | number> = { limit };
  if (options.after) {
    searchParams.after = options.after;
  }
  if (options.version) {
    searchParams['filter[version]'] = options.version;
  }

  return policyEngineRequest(
    client
      .get(`v1/policy-engine/policy-bundles/${bundleId}/versions`, {
        searchParams,
      })
      .json<PolicyBundleVersionListResponse>(),
  );
}

/**
 * Fetches version metadata and presigned download URL (mirrors `transcend policy download --json`).
 *
 * @param client - Policy Engine REST client
 * @param versionId - Version UUID
 * @returns Version metadata with download URL
 */
export async function getPolicyBundleVersion(
  client: Got,
  versionId: string,
): Promise<GetPolicyBundleVersionResponse> {
  return policyEngineRequest(
    client
      .get(`v1/policy-engine/policy-bundle-versions/${versionId}`)
      .json<GetPolicyBundleVersionResponse>(),
  );
}

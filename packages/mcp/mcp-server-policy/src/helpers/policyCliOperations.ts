import type { Got } from 'got';

import { throwPolicyEngineRequestError } from './formatPolicyEngineRequestError.js';
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
 * @param options - Pagination and optional name filter
 * @returns Bundle list response
 */
export async function listPolicyBundles(
  client: Got,
  options: {
    /** Page size */
    limit?: number;
    /** Offset into the result set */
    offset?: number;
    /** When set, filter to this tenant-unique bundle name */
    bundleName?: string;
  } = {},
): Promise<PolicyBundleListResponse> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const searchParams: Record<string, string | number> = { limit, offset };
  if (options.bundleName) {
    searchParams['filter[bundleName]'] = options.bundleName;
  }

  try {
    return await client
      .get('v1/policy-engine/policy-bundles', {
        searchParams,
      })
      .json<PolicyBundleListResponse>();
  } catch (error) {
    throwPolicyEngineRequestError(error);
  }
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
  options: {
    /** Page size */
    limit?: number;
    /** Cursor from a prior page */
    after?: string;
    /** When set, filter to this version label */
    version?: string;
  } = {},
): Promise<PolicyBundleVersionListResponse> {
  const limit = options.limit ?? 50;
  const searchParams: Record<string, string | number> = { limit };
  if (options.after) {
    searchParams.after = options.after;
  }
  if (options.version) {
    searchParams['filter[version]'] = options.version;
  }

  try {
    return await client
      .get(`v1/policy-engine/policy-bundles/${bundleId}/versions`, {
        searchParams,
      })
      .json<PolicyBundleVersionListResponse>();
  } catch (error) {
    throwPolicyEngineRequestError(error);
  }
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
  try {
    return await client
      .get(`v1/policy-engine/policy-bundle-versions/${versionId}`)
      .json<GetPolicyBundleVersionResponse>();
  } catch (error) {
    throwPolicyEngineRequestError(error);
  }
}

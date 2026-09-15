import type { Got } from 'got';

import {
  policyEngineRequest,
  throwPolicyEngineRequestError,
} from './formatPolicyEngineRequestError.js';
import type {
  GetPolicyBundleVersionResponse,
  PolicyBundle,
  PolicyBundleVersion,
  PolicyBundleVersionListResponse,
} from './types.js';

/** Options for resolving a policy bundle version. */
export interface ResolvePolicyBundleVersionOptions {
  /** Caller-supplied version label */
  version?: string;
  /** Version UUID */
  versionId?: string;
}

/**
 * Maps a direct version-by-id API response to the canonical version record shape.
 *
 * @param body - Version metadata from `GET /policy-bundle-versions/:versionId`
 * @returns Version record used by MCP tools
 */
function mapGetPolicyBundleVersionResponse(
  body: GetPolicyBundleVersionResponse,
): PolicyBundleVersion {
  return {
    id: body.versionId,
    version: body.version,
    sha256: body.sha256,
    sizeBytes: body.sizeBytes,
    description: body.description,
    createdBy: '',
    activatedAt: body.activatedAt,
    deactivatedAt: body.deactivatedAt,
    createdAt: body.uploadedAt,
    updatedAt: body.uploadedAt,
  };
}

/**
 * Fetches a version scoped to a parent bundle via list filters.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @param searchParams - List endpoint query parameters
 * @returns First matching version on the page
 */
async function fetchPolicyBundleVersionPage(
  client: Got,
  bundleId: string,
  searchParams: Record<string, string | number>,
): Promise<PolicyBundleVersion | undefined> {
  const body = await policyEngineRequest(
    client
      .get(`v1/policy-engine/policy-bundles/${bundleId}/versions`, {
        searchParams,
      })
      .json<PolicyBundleVersionListResponse>(),
  );

  return body.nodes[0];
}

/**
 * Resolves a version by UUID and verifies it belongs to the given parent bundle.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @param versionId - Version UUID
 * @returns Matching version record
 */
async function resolvePolicyBundleVersionById(
  client: Got,
  bundleId: string,
  versionId: string,
): Promise<PolicyBundleVersion> {
  let body: GetPolicyBundleVersionResponse;
  try {
    body = await client
      .get(`v1/policy-engine/policy-bundle-versions/${versionId}`)
      .json<GetPolicyBundleVersionResponse>();
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { statusCode?: number } }).response?.statusCode === 404
    ) {
      throw new Error(`Version id "${versionId}" was not found for this policy bundle.`);
    }
    throwPolicyEngineRequestError(error);
  }

  const bundle = await policyEngineRequest(
    client.get(`v1/policy-engine/policy-bundles/${bundleId}`).json<PolicyBundle>(),
  );

  if (body.bundleName !== bundle.bundleName) {
    throw new Error(`Version id "${versionId}" was not found for this policy bundle.`);
  }

  return mapGetPolicyBundleVersionResponse(body);
}

/**
 * Resolves a version label or UUID to a version record.
 *
 * Mirrors `transcend policy activate` / `download` version resolution in the CLI.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Parent bundle UUID
 * @param options - Version lookup options
 * @returns Matching version record
 */
export async function resolvePolicyBundleVersion(
  client: Got,
  bundleId: string,
  options: ResolvePolicyBundleVersionOptions,
): Promise<PolicyBundleVersion> {
  if (options.versionId) {
    return resolvePolicyBundleVersionById(client, bundleId, options.versionId);
  }

  const searchParams: Record<string, string | number> = { limit: 1 };
  if (options.version) {
    searchParams['filter[version]'] = options.version;
  }

  const match = await fetchPolicyBundleVersionPage(client, bundleId, searchParams);

  if (!match) {
    if (options.version) {
      throw new Error(`Version "${options.version}" was not found for this policy bundle.`);
    }
    throw new Error('No versions found for this policy bundle.');
  }

  return match;
}

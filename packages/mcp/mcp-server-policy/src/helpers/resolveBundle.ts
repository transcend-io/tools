import type { Got } from 'got';

import {
  policyEngineRequest,
  throwPolicyEngineRequestError,
} from './formatPolicyEngineRequestError.js';
import type { PolicyBundle, PolicyBundleListResponse } from './types.js';

/**
 * Resolves a bundle name to its parent record via the bundleName list filter.
 *
 * Same logic as `transcend policy bundles` / publish / activate helpers in the CLI.
 *
 * @param client - Policy Engine REST client
 * @param bundleName - Bundle name to resolve
 * @returns Matching bundle when found
 */
export async function resolveBundleByName(
  client: Got,
  bundleName: string,
): Promise<PolicyBundle | undefined> {
  const body = await policyEngineRequest(
    client
      .get('v1/policy-engine/policy-bundles', {
        searchParams: { 'filter[bundleName]': bundleName, limit: 1, offset: 0 },
      })
      .json<PolicyBundleListResponse>(),
  );

  return body.nodes[0];
}

/**
 * Resolves a bundle UUID by name.
 *
 * @param client - Policy Engine REST client
 * @param bundleName - Bundle name to resolve
 * @returns Bundle UUID when found
 */
export async function resolveBundleIdByName(
  client: Got,
  bundleName: string,
): Promise<string | undefined> {
  const bundle = await resolveBundleByName(client, bundleName);
  return bundle?.id;
}

/**
 * Resolves a bundle by UUID.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Bundle UUID
 * @returns Matching bundle when found
 */
export async function resolveBundleById(
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
 * Resolves a bundle by UUID or tenant-unique name.
 *
 * @param client - Policy Engine REST client
 * @param bundleId - Bundle UUID
 * @param bundleName - Tenant-unique bundle name
 * @returns Matching bundle
 */
export async function resolveBundle(
  client: Got,
  options: { bundleId?: string; bundleName?: string },
): Promise<PolicyBundle> {
  if (options.bundleId) {
    const byId = await resolveBundleById(client, options.bundleId);
    if (byId) {
      return byId;
    }
    throw new Error(`Policy bundle with id "${options.bundleId}" was not found.`);
  }

  if (options.bundleName) {
    const byName = await resolveBundleByName(client, options.bundleName);
    if (byName) {
      return byName;
    }
    throw new Error(`Policy bundle "${options.bundleName}" was not found.`);
  }

  throw new Error('Provide bundleId or bundleName.');
}

import type { Got } from 'got';

import type { PolicyBundle, PolicyBundleListResponse } from '../types.js';
import { policyEngineRequest } from './formatPolicyEngineRequestError.js';

/**
 * Resolves a bundle name to its parent record via the bundleName list filter.
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
 * Resolves a bundle name to its UUID via the bundleName list filter.
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

import type { Got } from 'got';

import type { PolicyBundle, PolicyBundleListResponse } from '../types.js';
import { policyEngineRequest } from './formatPolicyEngineRequestError.js';

/**
 * Resolves a bundle name to its parent record by scanning offset-paginated listings.
 *
 * @param client - Policy Engine REST client
 * @param bundleName - Bundle name to resolve
 * @returns Matching bundle when found
 */
export async function resolveBundleByName(
  client: Got,
  bundleName: string,
): Promise<PolicyBundle | undefined> {
  const limit = 100;
  let offset = 0;

  while (true) {
    const body = await policyEngineRequest(
      client
        .get('v1/policy-engine/policy-bundles', {
          searchParams: { limit, offset },
        })
        .json<PolicyBundleListResponse>(),
    );

    const match = body.nodes.find((bundle) => bundle.bundleName === bundleName);
    if (match) {
      return match;
    }

    offset += body.nodes.length;
    if (offset >= body.totalCount || body.nodes.length === 0) {
      return undefined;
    }
  }
}

/**
 * Resolves a bundle name to its UUID by scanning offset-paginated bundle listings.
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

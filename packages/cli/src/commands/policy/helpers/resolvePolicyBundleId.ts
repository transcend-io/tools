import type { Got } from 'got';

import { resolveBundleIdByName } from './resolveBundleIdByName.js';

/** Options for resolving a policy bundle identifier. */
export interface ResolvePolicyBundleIdOptions {
  /** Explicit bundle UUID */
  policyBundleId?: string;
  /** Bundle name to resolve */
  bundleName?: string;
}

/**
 * Resolves a bundle identifier from an explicit UUID or bundle name.
 *
 * @param client - Policy Engine REST client
 * @param options - Bundle lookup options
 * @returns Bundle UUID
 */
export async function resolvePolicyBundleId(
  client: Got,
  options: ResolvePolicyBundleIdOptions,
): Promise<string> {
  if (options.policyBundleId) {
    return options.policyBundleId;
  }

  if (options.bundleName) {
    const bundleId = await resolveBundleIdByName(client, options.bundleName);
    if (bundleId) {
      return bundleId;
    }
    throw new Error(`Policy bundle "${options.bundleName}" was not found for this organization.`);
  }

  throw new Error('Must specify --policyBundleId or --bundleName.');
}

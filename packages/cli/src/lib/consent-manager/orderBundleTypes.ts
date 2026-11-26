import { ConsentBundleType } from '@transcend-io/privacy-types';

/**
 * Remove duplicate bundle types and put TEST before PRODUCTION.
 * Deploying TEST first lets a bad TEST deploy stop the run before PRODUCTION changes.
 *
 * @param bundleTypes - Requested bundle types
 * @returns Unique bundle types in deploy order
 */
export function orderBundleTypes(bundleTypes: ConsentBundleType[]): ConsentBundleType[] {
  const requested = new Set(bundleTypes);
  return [ConsentBundleType.Test, ConsentBundleType.Production].filter((type) =>
    requested.has(type),
  );
}

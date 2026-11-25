import { ConsentBundleType } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  diffConsentBundleDeploy,
  fetchConsentBundleDeployDiff,
  fetchConsentManagerId,
  summarizeConsentBundleDeployDiff,
  type ConsentBundleDeployDiff,
} from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { orderBundleTypes } from './orderBundleTypes.js';

/** Preview of one bundle type */
export interface ConsentManagerDeployPreview {
  /** TEST or PRODUCTION */
  bundleType: ConsentBundleType;
  /** Whether a deploy would change anything */
  hasChanges: boolean;
  /** Plain-text summary */
  summary: string;
  /** Full module diff */
  diff: ConsentBundleDeployDiff;
}

/**
 * Show what a consent manager deploy would change. Read-only.
 *
 * @param options - Options
 * @returns One preview per bundle type, TEST first
 */
export async function previewConsentManagerDeploy({
  auth,
  transcendUrl = DEFAULT_TRANSCEND_API,
  bundleTypes = [ConsentBundleType.Test, ConsentBundleType.Production],
}: {
  /** Transcend API key authentication */
  auth: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** The bundle types to preview */
  bundleTypes?: ConsentBundleType[];
}): Promise<ConsentManagerDeployPreview[]> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const airgapBundleId = await fetchConsentManagerId(client);

  return mapSeries(orderBundleTypes(bundleTypes), async (bundleType) => {
    const inputs = await fetchConsentBundleDeployDiff(client, { airgapBundleId, bundleType });
    const diff = diffConsentBundleDeploy(inputs);
    return {
      bundleType,
      hasChanges: diff.firstDeploy || diff.hasChanges,
      summary: summarizeConsentBundleDeployDiff(diff, bundleType),
      diff,
    };
  });
}

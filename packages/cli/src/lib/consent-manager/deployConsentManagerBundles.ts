import { ConsentBundleType } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  deployConsentManager,
  fetchConsentManagerId,
  waitForConsentManagerDeploy,
} from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { orderBundleTypes } from './orderBundleTypes.js';

/**
 * Deploy the consent manager bundles without changing the airgap.js version.
 * Deploys TEST before PRODUCTION, one at a time, and stops on the first failure.
 *
 * @param options - Options
 */
export async function deployConsentManagerBundles({
  auth,
  transcendUrl = DEFAULT_TRANSCEND_API,
  bundleTypes = [ConsentBundleType.Test, ConsentBundleType.Production],
  expectBundleId,
  wait = false,
  waitTimeoutSeconds = 600,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** The bundle types to deploy */
  bundleTypes?: ConsentBundleType[];
  /** Abort unless the organization's consent manager has this ID */
  expectBundleId?: string;
  /** Wait for each deploy to finish before moving on */
  wait?: boolean;
  /** Max seconds to wait for each deploy */
  waitTimeoutSeconds?: number;
}): Promise<void> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Grab Consent Manager ID
  const consentManagerId = await fetchConsentManagerId(client, { logger });

  // Guard against a wrong API key publishing another organization's bundle
  if (expectBundleId && expectBundleId !== consentManagerId) {
    throw new Error(
      `Consent Manager ID mismatch. Expected "${expectBundleId}" but the API key belongs to "${consentManagerId}". Nothing was deployed.`,
    );
  }

  await mapSeries(orderBundleTypes(bundleTypes), async (bundleType) => {
    logger.info(
      colors.magenta(
        `Deploying Consent Manager bundle with ID "${consentManagerId}" and type "${bundleType}"...`,
      ),
    );
    await deployConsentManager(client, { id: consentManagerId, bundleType }, { logger });

    if (wait) {
      await waitForConsentManagerDeploy(client, {
        timeoutMs: waitTimeoutSeconds * 1000,
        logger,
      });
    }

    logger.info(
      colors.green(
        `${wait ? 'Deployed' : 'Requested deploy of'} Consent Manager bundle with ID "${consentManagerId}" and type "${bundleType}"!`,
      ),
    );
  });
}

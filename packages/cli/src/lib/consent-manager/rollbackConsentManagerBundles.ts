import { ConsentBundleType } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  fetchConsentManagerId,
  fetchConsentManagerRollbackTarget,
  rollbackConsentManagerToTarget,
} from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import { DEFAULT_TRANSCEND_API } from '../../constants.js';
import { logger } from '../../logger.js';
import { orderBundleTypes } from './orderBundleTypes.js';

/**
 * Roll consent manager bundles back to a previously deployed airgap.js version.
 * Looks up every target first, so a missing target changes nothing.
 *
 * @param options - Options
 */
export async function rollbackConsentManagerBundles({
  auth,
  transcendUrl = DEFAULT_TRANSCEND_API,
  bundleTypes,
  version,
  dryRun = false,
}: {
  /** Transcend API key authentication */
  auth: string;
  /** API URL for Transcend backend */
  transcendUrl?: string;
  /** The bundle types to roll back */
  bundleTypes: ConsentBundleType[];
  /** airgap.js version to roll back to */
  version: string;
  /** Only look up targets, do not roll back */
  dryRun?: boolean;
}): Promise<void> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  const consentManagerId = await fetchConsentManagerId(client, { logger });

  const targets = await mapSeries(orderBundleTypes(bundleTypes), async (bundleType) => ({
    bundleType,
    target: await fetchConsentManagerRollbackTarget(client, {
      id: consentManagerId,
      bundleType,
      version,
      logger,
    }),
  }));

  await mapSeries(targets, async ({ bundleType, target }) => {
    const description = `Consent Manager bundle with ID "${consentManagerId}" and type "${bundleType}" to airgap.js version "${target.version}" (deployed ${target.deployedAt})`;
    if (dryRun) {
      logger.info(colors.yellow(`Dry run: would roll back ${description}`));
      return;
    }
    logger.info(colors.magenta(`Rolling back ${description}...`));
    await rollbackConsentManagerToTarget(client, { id: consentManagerId, target, logger });
    logger.info(colors.green(`Rolled back ${description}!`));
  });
}

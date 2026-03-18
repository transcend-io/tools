import { ConsentBundleType } from '@transcend-io/privacy-types';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { mapSeries } from '../../../lib/bluebird.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { updateConsentManagerVersionToLatest } from '../../../lib/consent-manager/index.js';
import { logger } from '../../../logger.js';

export interface UpdateConsentManagerCommandFlags {
  auth: string;
  bundleTypes: ConsentBundleType[];
  deploy: boolean;
  transcendUrl: string;
}

export async function updateConsentManager(
  this: LocalContext,
  {
    auth,
    bundleTypes = [ConsentBundleType.Production, ConsentBundleType.Test],
    deploy,
    transcendUrl,
  }: UpdateConsentManagerCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Handle single update
  if (typeof apiKeyOrList === 'string') {
    // Update consent manager
    await updateConsentManagerVersionToLatest({
      deploy,
      transcendUrl,
      auth: apiKeyOrList,
      bundleTypes,
    });
    logger.info(colors.green('Successfully updated Consent Manager!'));
  } else {
    await mapSeries(apiKeyOrList, async (apiKey) => {
      logger.info(
        colors.magenta(`Updating Consent Manager for organization "${apiKey.organizationName}"...`),
      );

      await updateConsentManagerVersionToLatest({
        deploy,
        transcendUrl,
        auth: apiKey.apiKey,
        bundleTypes,
      });

      logger.info(
        colors.green(
          `Successfully updated Consent Manager for organization "${apiKey.organizationName}"!`,
        ),
      );
    });
    logger.info(colors.green('Successfully updated Consent Managers!'));
  }
}

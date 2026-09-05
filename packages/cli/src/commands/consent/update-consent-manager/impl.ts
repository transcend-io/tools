import { ConsentBundleType } from '@transcend-io/privacy-types';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { updateConsentManagerVersionToLatest } from '../../../lib/consent-manager/index.js';

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
  doneInputValidation(this.process);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth, {
    fs: this.fs,
    exit: this.process.exit,
    logger: this.logger,
  });

  // Handle single update
  if (typeof apiKeyOrList === 'string') {
    // Update consent manager
    await updateConsentManagerVersionToLatest(
      {
        deploy,
        transcendUrl,
        auth: apiKeyOrList,
        bundleTypes,
      },
      { logger: this.logger },
    );
    this.logger.info(colors.green('Successfully updated Consent Manager!'));
  } else {
    await mapSeries(apiKeyOrList, async (apiKey) => {
      this.logger.info(
        colors.magenta(`Updating Consent Manager for organization "${apiKey.organizationName}"...`),
      );

      await updateConsentManagerVersionToLatest(
        {
          deploy,
          transcendUrl,
          auth: apiKey.apiKey,
          bundleTypes,
        },
        { logger: this.logger },
      );

      this.logger.info(
        colors.green(
          `Successfully updated Consent Manager for organization "${apiKey.organizationName}"!`,
        ),
      );
    });
    this.logger.info(colors.green('Successfully updated Consent Managers!'));
  }
}

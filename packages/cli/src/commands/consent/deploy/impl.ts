import { ConsentBundleType } from '@transcend-io/privacy-types';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { deployConsentManagerBundles } from '../../../lib/consent-manager/deployConsentManagerBundles.js';

export interface DeployCommandFlags {
  auth: string;
  bundleTypes?: ConsentBundleType[];
  expectBundleId?: string;
  wait: boolean;
  waitTimeoutSeconds: number;
  transcendUrl: string;
}

export async function deploy(
  this: LocalContext,
  {
    auth,
    bundleTypes = [ConsentBundleType.Test, ConsentBundleType.Production],
    expectBundleId,
    wait,
    waitTimeoutSeconds,
    transcendUrl,
  }: DeployCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth, this);

  if (typeof apiKeyOrList === 'string') {
    await deployConsentManagerBundles({
      auth: apiKeyOrList,
      transcendUrl,
      bundleTypes,
      expectBundleId,
      wait,
      waitTimeoutSeconds,
    });
    this.logger.info(colors.green('Successfully deployed Consent Manager!'));
    return;
  }

  // One expected ID cannot match many organizations
  if (expectBundleId) {
    this.logger.error(
      colors.red('--expectBundleId cannot be used with a file of API keys. Use one API key.'),
    );
    this.process.exit(1);
    return;
  }

  await mapSeries(apiKeyOrList, async (apiKey) => {
    this.logger.info(
      colors.magenta(`Deploying Consent Manager for organization "${apiKey.organizationName}"...`),
    );
    await deployConsentManagerBundles({
      auth: apiKey.apiKey,
      transcendUrl,
      bundleTypes,
      wait,
      waitTimeoutSeconds,
    });
    this.logger.info(
      colors.green(
        `Successfully deployed Consent Manager for organization "${apiKey.organizationName}"!`,
      ),
    );
  });
  this.logger.info(colors.green('Successfully deployed Consent Managers!'));
}

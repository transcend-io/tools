import { ConsentBundleType } from '@transcend-io/privacy-types';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  previewConsentManagerDeploy,
  type ConsentManagerDeployPreview,
} from '../../../lib/consent-manager/previewConsentManagerDeploy.js';

export interface PreviewDeployCommandFlags {
  auth: string;
  bundleTypes?: ConsentBundleType[];
  json: boolean;
  transcendUrl: string;
}

/** Previews for one organization */
interface OrganizationPreview {
  /** Organization name, only known when auth is a file of API keys */
  organizationName?: string;
  /** One preview per bundle type */
  results: ConsentManagerDeployPreview[];
}

export async function previewDeploy(
  this: LocalContext,
  {
    auth,
    bundleTypes = [ConsentBundleType.Test, ConsentBundleType.Production],
    json,
    transcendUrl,
  }: PreviewDeployCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth, this);
  const keys: { apiKey: string; organizationName?: string }[] =
    typeof apiKeyOrList === 'string' ? [{ apiKey: apiKeyOrList }] : apiKeyOrList;

  const organizations: OrganizationPreview[] = await mapSeries(keys, async (key) => ({
    organizationName: key.organizationName,
    results: await previewConsentManagerDeploy({
      auth: key.apiKey,
      transcendUrl,
      bundleTypes,
    }),
  }));

  // Keep stdout clean so the JSON can be piped
  if (json) {
    this.process.stdout.write(`${JSON.stringify({ organizations }, null, 2)}\n`);
    return;
  }

  organizations.forEach(({ organizationName, results }) => {
    if (organizationName) {
      this.logger.info(colors.magenta(`Organization "${organizationName}"`));
    }
    results.forEach(({ summary, hasChanges, bundleType }) => {
      this.logger.info(summary);
      this.logger.info(
        hasChanges
          ? colors.yellow(`${bundleType}: there are changes to deploy.`)
          : colors.green(`${bundleType}: there are no changes to deploy.`),
      );
    });
  });
}

import { writeFileSync } from 'node:fs';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { buildXdiSyncEndpoint as buildXdiSyncEndpointHelper } from '../../../lib/consent-manager/index.js';
import { logger } from '../../../logger.js';

export interface BuildXdiSyncEndpointCommandFlags {
  auth: string;
  xdiLocation: string;
  file: string;
  removeIpAddresses: boolean;
  domainBlockList: string[];
  xdiAllowedCommands: string;
  transcendUrl: string;
}

export async function buildXdiSyncEndpoint(
  this: LocalContext,
  {
    auth,
    xdiLocation,
    file,
    removeIpAddresses,
    domainBlockList,
    xdiAllowedCommands,
    transcendUrl,
  }: BuildXdiSyncEndpointCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth);

  // Build the sync endpoint
  const { syncGroups, html } = await buildXdiSyncEndpointHelper(apiKeyOrList, {
    xdiLocation,
    transcendUrl,
    removeIpAddresses,
    domainBlockList: domainBlockList.length > 0 ? domainBlockList : undefined,
    xdiAllowedCommands,
  });

  // Log success
  logger.info(
    colors.green(
      `Successfully constructed sync endpoint for sync groups: ${JSON.stringify(
        syncGroups,
        null,
        2,
      )}`,
    ),
  );

  // Write to disk
  writeFileSync(file, html);
  logger.info(colors.green(`Wrote configuration to file "${file}"!`));
}

import { existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { listFiles } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { consentManagersToBusinessEntities as consentManagersToBusinessEntitiesHelper } from '../../../lib/consent-manager/index.js';
import { readTranscendYaml, writeTranscendYaml } from '../../../lib/readTranscendYaml.js';
import { logger } from '../../../logger.js';

export interface ConsentManagersToBusinessEntitiesCommandFlags {
  consentManagerYmlFolder: string;
  output: string;
}

export function consentManagersToBusinessEntities(
  this: LocalContext,
  { consentManagerYmlFolder, output }: ConsentManagersToBusinessEntitiesCommandFlags,
): void {
  doneInputValidation(this.process.exit);

  // Ensure folder is passed
  if (!existsSync(consentManagerYmlFolder) || !lstatSync(consentManagerYmlFolder).isDirectory()) {
    logger.error(colors.red(`Folder does not exist: "${consentManagerYmlFolder}"`));
    this.process.exit(1);
  }

  // Read in each consent manager configuration
  const inputs = listFiles(consentManagerYmlFolder).map((directory) => {
    const { 'consent-manager': consentManager } = readTranscendYaml(
      join(consentManagerYmlFolder, directory),
    );
    return { name: directory, input: consentManager };
  });

  // Convert to business entities
  const businessEntities = consentManagersToBusinessEntitiesHelper(inputs);

  // write to disk
  writeTranscendYaml(output, {
    'business-entities': businessEntities,
  });

  logger.info(
    colors.green(
      `Successfully wrote ${businessEntities.length} business entities to file "${output}"`,
    ),
  );
}

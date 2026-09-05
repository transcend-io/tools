import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { listFiles } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { consentManagersToBusinessEntities as consentManagersToBusinessEntitiesHelper } from '../../../lib/consent-manager/index.js';
import { readTranscendYaml, writeTranscendYaml } from '../../../lib/readTranscendYaml.js';

export interface ConsentManagersToBusinessEntitiesCommandFlags {
  consentManagerYmlFolder: string;
  output: string;
}

export function consentManagersToBusinessEntities(
  this: LocalContext,
  { consentManagerYmlFolder, output }: ConsentManagersToBusinessEntitiesCommandFlags,
): void {
  doneInputValidation(this.process);

  // Ensure folder is passed
  if (
    !this.fs.existsSync(consentManagerYmlFolder) ||
    !this.fs.lstatSync(consentManagerYmlFolder).isDirectory()
  ) {
    this.logger.error(colors.red(`Folder does not exist: "${consentManagerYmlFolder}"`));
    this.process.exit(1);
  }

  // Read in each consent manager configuration
  const inputs = listFiles(consentManagerYmlFolder, undefined, false, { fs: this.fs }).map(
    (directory) => {
      const { 'consent-manager': consentManager } = readTranscendYaml(
        this.path.join(consentManagerYmlFolder, directory),
        {},
        { fs: this.fs },
      );
      return { name: directory, input: consentManager };
    },
  );

  // Convert to business entities
  const businessEntities = consentManagersToBusinessEntitiesHelper(inputs, {
    logger: this.logger,
  });

  // write to disk
  writeTranscendYaml(
    output,
    {
      'business-entities': businessEntities,
    },
    { fs: this.fs },
  );

  this.logger.info(
    colors.green(
      `Successfully wrote ${businessEntities.length} business entities to file "${output}"`,
    ),
  );
}

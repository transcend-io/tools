import path from 'node:path';

import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { filterFileNames } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { consentManagersToBusinessEntities as consentManagersToBusinessEntitiesHelper } from '../../../lib/consent-manager/index.js';
import { parseTranscendYaml, serializeTranscendYaml } from '../../../lib/readTranscendYaml.js';

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
  const inputs = filterFileNames(this.fs.readdirSync(consentManagerYmlFolder)).map((directory) => {
    const inputPath = path.join(consentManagerYmlFolder, directory);
    const { 'consent-manager': consentManager } = parseTranscendYaml(
      this.fs.readFileSync(inputPath, 'utf8'),
      {},
      inputPath,
    );
    return { name: directory, input: consentManager };
  });

  // Convert to business entities
  const businessEntities = consentManagersToBusinessEntitiesHelper(inputs);

  this.logger.info('\n\n~~~~~~~~~~~\nAirgap scripts to host:');
  businessEntities.forEach(({ attributes, title }, index) => {
    attributes
      ?.find((attribute) => attribute.key === 'Airgap Production URL')
      ?.values?.forEach((url) => {
        this.logger.info(`${index}) ${title} - ${url}`);
      });
  });

  this.fs.writeFileSync(
    output,
    serializeTranscendYaml({
      'business-entities': businessEntities,
    }),
  );

  this.logger.info(
    colors.green(
      `Successfully wrote ${businessEntities.length} business entities to file "${output}"`,
    ),
  );
}

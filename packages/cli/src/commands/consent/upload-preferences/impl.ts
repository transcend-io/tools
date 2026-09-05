import { map, splitCsvToList } from '@transcend-io/utils';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { uploadPreferenceManagementPreferencesInteractive } from '../../../lib/preference-management/index.js';

export interface UploadPreferencesCommandFlags {
  auth: string;
  partition: string;
  sombraAuth?: string;
  transcendUrl: string;
  file?: string;
  directory?: string;
  dryRun: boolean;
  skipExistingRecordCheck: boolean;
  receiptFileDir: string;
  skipWorkflowTriggers: boolean;
  forceTriggerWorkflows: boolean;
  skipConflictUpdates: boolean;
  isSilent: boolean;
  attributes: string;
  receiptFilepath: string;
  concurrency: number;
}

export async function uploadPreferences(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    transcendUrl,
    file = '',
    directory,
    dryRun,
    skipExistingRecordCheck,
    receiptFileDir,
    skipWorkflowTriggers,
    forceTriggerWorkflows,
    skipConflictUpdates,
    isSilent,
    attributes,
    concurrency,
  }: UploadPreferencesCommandFlags,
): Promise<void> {
  if (!!directory && !!file) {
    this.logger.error(
      colors.red('Cannot provide both a directory and a file. Please provide only one.'),
    );
    this.process.exit(1);
  }

  if (!file && !directory) {
    this.logger.error(
      colors.red(
        'A file or directory must be provided. Please provide one using --file=./preferences.csv or --directory=./preferences',
      ),
    );
    this.process.exit(1);
  }

  doneInputValidation(this.process);

  const files: string[] = [];

  if (directory) {
    try {
      const filesInDirectory = this.fs.readdirSync(directory);
      const csvFiles = filesInDirectory.filter((file) => file.endsWith('.csv'));

      if (csvFiles.length === 0) {
        this.logger.error(colors.red(`No CSV files found in directory: ${directory}`));
        this.process.exit(1);
      }

      // Add full paths for each CSV file
      files.push(...csvFiles.map((file) => this.path.join(directory, file)));
    } catch (err) {
      this.logger.error(colors.red(`Failed to read directory: ${directory}`));
      this.logger.error(colors.red((err as Error).message));
      this.process.exit(1);
    }
  } else {
    try {
      // Verify file exists and is a CSV
      if (!file.endsWith('.csv')) {
        this.logger.error(colors.red('File must be a CSV file'));
        this.process.exit(1);
      }
      files.push(file);
    } catch (err) {
      this.logger.error(colors.red(`Failed to access file: ${file}`));
      this.logger.error(colors.red((err as Error).message));
      this.process.exit(1);
    }
  }

  this.logger.info(
    colors.green(
      `Processing ${files.length} consent preferences files for partition: ${partition}`,
    ),
  );
  this.logger.debug(`Files to process: ${files.join(', ')}`);

  if (skipExistingRecordCheck) {
    this.logger.info(colors.bgYellow(`Skipping existing record check: ${skipExistingRecordCheck}`));
  }

  await map(
    files,
    async (filePath) => {
      const fileName = this.path.basename(filePath).replace('.csv', '');
      await uploadPreferenceManagementPreferencesInteractive({
        receiptFilepath: this.path.join(receiptFileDir, `${fileName}-receipts.json`),
        auth,
        sombraAuth,
        file: filePath,
        partition,
        transcendUrl,
        skipConflictUpdates,
        skipWorkflowTriggers,
        skipExistingRecordCheck,
        isSilent,
        dryRun,
        attributes: splitCsvToList(attributes),
        forceTriggerWorkflows,
      });
    },
    { concurrency },
  );
}

import { createSombraGotInstance } from '@transcend-io/sdk';
import { map } from '@transcend-io/utils';
import cliProgress from 'cli-progress';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { writeCsv } from '../../../lib/helpers/index.js';
import { bulkDeletePreferenceRecords } from '../../../lib/preference-management/index.js';

export interface DeletePreferenceRecordsCommandFlags {
  /** Transcend API key for authentication */
  auth: string;
  /** Partition ID to delete preference records from */
  partition: string;
  /** Optional Sombra internal key for self-hosted instances */
  sombraAuth?: string;
  /** Path to the CSV file used to identify preference records to delete */
  file?: string;
  /** Path to the directory of CSV files to load preferences from */
  directory?: string;
  /** Base URL for the Transcend API */
  transcendUrl: string;
  /** The timestamp when the deletion operation is made. Used for logging purposes. */
  timestamp: Date;
  /** Maximum items to include in each deletion chunk */
  maxItemsInChunk: number;
  /** Maximum concurrency for deletion requests */
  maxConcurrency: number;
  /** Directory to write receipts of failed deletions to */
  receiptDirectory: string;
  /** Number of files to process concurrently when deleting preference records from multiple files */
  fileConcurrency: number;
}

export async function deletePreferenceRecords(
  this: LocalContext,
  {
    auth,
    partition,
    sombraAuth,
    file = '',
    directory,
    transcendUrl,
    timestamp,
    maxConcurrency,
    maxItemsInChunk,
    receiptDirectory,
    fileConcurrency,
  }: DeletePreferenceRecordsCommandFlags,
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

  this.logger.debug(
    colors.green(
      `Processing ${files.length} consent preferences files for partition: ${partition}`,
    ),
  );
  this.logger.debug(`\nFiles to process: ${files.join(', ')}\n`);

  // Create sombra instance to communicate with
  const sombra = await createSombraGotInstance(transcendUrl, auth, {
    logger: this.logger,
    sombraApiKey: sombraAuth,
    sombraUrl: this.process.env.SOMBRA_URL,
  });
  const globalProgressBar = new cliProgress.SingleBar(
    {
      format: `Deletion Progress |${colors.cyan('[{bar}]')}| Duration: ${colors.red(
        '{duration_formatted}',
      )} | {value}/{total} Files Processed `,
    },
    cliProgress.Presets.shades_classic,
  );
  globalProgressBar.start(files.length, 0);

  // Process batch of files with concurrency
  const failedResultsArrays = await map(
    files,
    async (filePath) => {
      const result = await bulkDeletePreferenceRecords(sombra, {
        partition,
        filePath,
        timestamp,
        maxItemsInChunk,
        maxConcurrency,
      });
      globalProgressBar.increment();
      return result;
    },
    { concurrency: fileConcurrency },
  );
  globalProgressBar.stop();
  const failedResults = failedResultsArrays.flat();

  // Check for failed results and write receipt if any
  let receiptPath = '';
  if (failedResults.length > 0) {
    receiptPath = this.path.join(receiptDirectory, `deletion-failures-${Date.now()}.csv`);
    writeCsv(receiptPath, failedResults, true);
  }

  this.logger.info(colors.green('\n\n ================================== \n\n'));
  this.logger.info(colors.green('\n#### Deletion Summary Report #####\n'));
  this.logger.info(
    colors.green(
      `📁 Total Files Processed: ${files.length} \n` +
        `❌ Errors: ${failedResults.length} \n` +
        `📝 Receipt Path: ${receiptPath || 'N/A'}`,
    ),
  );
  this.logger.info(colors.green('\n\n==================================\n\n'));
}

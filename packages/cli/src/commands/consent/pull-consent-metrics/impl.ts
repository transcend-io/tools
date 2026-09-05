import { ConsentManagerMetricBin } from '@transcend-io/privacy-types';
import { buildTranscendGraphQLClient } from '@transcend-io/sdk';
import { map, mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import { ADMIN_DASH_INTEGRATIONS } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { pullConsentManagerMetrics } from '../../../lib/consent-manager/index.js';
import { writeCsv } from '../../../lib/helpers/index.js';

export interface PullConsentMetricsCommandFlags {
  auth: string;
  start: Date;
  end?: Date;
  folder: string;
  bin: string;
  transcendUrl: string;
}

export async function pullConsentMetrics(
  this: LocalContext,
  { auth, start, end, folder, bin, transcendUrl }: PullConsentMetricsCommandFlags,
): Promise<void> {
  // Validate bin
  const parsedBin = bin as ConsentManagerMetricBin;
  if (!Object.values(ConsentManagerMetricBin).includes(parsedBin)) {
    this.logger.error(
      colors.red(
        `Failed to parse argument "bin" with value "${bin}"\n` +
          `Expected one of: \n${Object.values(ConsentManagerMetricBin).join('\n')}`,
      ),
    );
    this.process.exit(1);
  }

  // Parse the dates
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (Number.isNaN(startDate.getTime())) {
    this.logger.error(
      colors.red(
        `Start date provided is invalid date. Got --start="${start}" expected --start="01/01/2023"`,
      ),
    );
    this.process.exit(1);
  }
  if (Number.isNaN(endDate.getTime())) {
    this.logger.error(
      colors.red(
        `End date provided is invalid date. Got --end="${end}" expected --end="01/01/2023"`,
      ),
    );
    this.process.exit(1);
  }
  if (startDate > endDate) {
    this.logger.error(
      colors.red(
        `Got a start date "${startDate.toISOString()}" that was larger than the end date "${endDate.toISOString()}". ` +
          'Start date must be before end date.',
      ),
    );
    this.process.exit(1);
  }

  doneInputValidation(this.process);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth, {
    fs: this.fs,
    exit: this.process.exit,
    logger: this.logger,
  });

  // Ensure folder either does not exist or is not a file
  if (this.fs.existsSync(folder) && !this.fs.lstatSync(folder).isDirectory()) {
    this.logger.error(
      colors.red(
        'The provided argument "folder" was passed a file. expected: folder="./consent-metrics/"',
      ),
    );
    this.process.exit(1);
  }

  // Create the folder if it does not exist
  if (!this.fs.existsSync(folder)) {
    this.fs.mkdirSync(folder);
  }

  this.logger.info(
    colors.magenta(
      `Pulling consent metrics from start=${startDate.toString()} to end=${endDate.toISOString()} with bin size "${bin}"`,
    ),
  );

  // Sync to Disk
  if (typeof apiKeyOrList === 'string') {
    try {
      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKeyOrList);

      // Pull the metrics
      const configuration = await pullConsentManagerMetrics(
        client,
        {
          bin: parsedBin,
          start: startDate,
          end: endDate,
        },
        { logger: this.logger },
      );

      // Write to file
      await map(
        Object.entries(configuration),
        async ([metricName, metrics]) => {
          await map(
            metrics,
            async ({ points, name }) => {
              const file = this.path.join(folder, `${metricName}_${name}.csv`);
              this.logger.info(colors.magenta(`Writing configuration to file "${file}"...`));
              await writeCsv(
                file,
                points.map(({ key, value }: { key: string; value: string }) => ({
                  timestamp: key,
                  value,
                })),
                undefined,
                { fs: this.fs },
              );
            },
            {
              concurrency: 5,
            },
          );
        },
        { concurrency: 5 },
      );
    } catch (err) {
      this.logger.error(colors.red(`An error occurred syncing the schema: ${err.message}`));
      this.process.exit(1);
    }

    // Indicate success
    this.logger.info(
      colors.green(
        `Successfully synced consent metrics to disk in folder "${folder}"! View at ${ADMIN_DASH_INTEGRATIONS}`,
      ),
    );
  } else {
    const encounteredErrors: string[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind + 1}/${apiKeyOrList.length}][${apiKey.organizationName}] `;
      this.logger.info(
        colors.magenta(`~~~\n\n${prefix}Attempting to pull consent metrics...\n\n~~~`),
      );

      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKey.apiKey);

      try {
        const configuration = await pullConsentManagerMetrics(
          client,
          {
            bin: parsedBin,
            start: startDate,
            end: endDate,
          },
          { logger: this.logger },
        );

        // ensure folder exists for that organization
        const subFolder = this.path.join(folder, apiKey.organizationName);
        if (!this.fs.existsSync(subFolder)) {
          this.fs.mkdirSync(subFolder);
        }

        // Write to file
        Object.entries(configuration).forEach(([metricName, metrics]) => {
          metrics.forEach(({ points, name }) => {
            const file = this.path.join(subFolder, `${metricName}_${name}.csv`);
            this.logger.info(colors.magenta(`Writing configuration to file "${file}"...`));
            writeCsv(
              file,
              points.map(({ key, value }: { key: string; value: string }) => ({
                timestamp: key,
                value,
              })),
              undefined,
              { fs: this.fs },
            );
          });
        });

        this.logger.info(colors.green(`${prefix}Successfully pulled configuration!`));
      } catch (err) {
        this.logger.error(colors.red(`${prefix}Failed to sync configuration.`), err);
        encounteredErrors.push(apiKey.organizationName);
      }
    });

    if (encounteredErrors.length > 0) {
      this.logger.info(
        colors.red(
          `Sync encountered errors for "${encounteredErrors.join(
            ',',
          )}". View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`,
        ),
      );

      this.process.exit(1);
    }
  }
}

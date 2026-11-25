import path from 'node:path';

import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  pullTranscendConfiguration,
  serializeTranscendYaml,
  TranscendPullResource,
} from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';
import { createTwoFilesPatch } from 'diff';

import { ADMIN_DASH_INTEGRATIONS } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { DEFAULT_CONSENT_TRACKER_STATUSES, DEFAULT_TRANSCEND_PULL_RESOURCES } from './command.js';

export interface PullCommandFlags {
  auth: string;
  resources?: (TranscendPullResource | 'all')[];
  file: string;
  transcendUrl: string;
  dataSiloIds?: string[];
  integrationNames?: string[];
  trackerStatuses?: ConsentTrackerStatus[];
  pageSize: number;
  skipDatapoints: boolean;
  skipSubDatapoints: boolean;
  includeGuessedCategories: boolean;
  debug: boolean;
  dryRun: boolean;
}

export async function pull(
  this: LocalContext,
  {
    auth,
    resources = DEFAULT_TRANSCEND_PULL_RESOURCES,
    file,
    transcendUrl,
    dataSiloIds = [],
    integrationNames = [],
    trackerStatuses = DEFAULT_CONSENT_TRACKER_STATUSES,
    pageSize,
    skipDatapoints,
    skipSubDatapoints,
    includeGuessedCategories,
    debug,
    dryRun,
  }: PullCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // Write the file, or with --dryRun show how it would change
  const writeConfiguration = (filePath: string, contents: string): void => {
    if (!dryRun) {
      this.logger.info(colors.magenta(`Writing configuration to file "${filePath}"...`));
      this.fs.writeFileSync(filePath, contents);
      return;
    }
    const existing = this.fs.existsSync(filePath) ? this.fs.readFileSync(filePath, 'utf8') : '';
    if (existing === contents) {
      this.logger.info(colors.green(`No changes to "${filePath}".`));
      return;
    }
    this.logger.info(
      createTwoFilesPatch(filePath, filePath, existing, contents, '', '', { context: 3 }),
    );
  };

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth, this);

  const resourcesToPull: TranscendPullResource[] = resources.includes('all')
    ? Object.values(TranscendPullResource)
    : (resources as TranscendPullResource[]);

  // Sync to Disk
  if (typeof apiKeyOrList === 'string') {
    try {
      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKeyOrList);

      const configuration = await pullTranscendConfiguration(client, {
        dataSiloIds,
        integrationNames,
        resources: resourcesToPull,
        pageSize,
        debug,
        skipDatapoints,
        skipSubDatapoints,
        includeGuessedCategories,
        trackerStatuses,
        logger: this.logger,
      });

      writeConfiguration(file, serializeTranscendYaml(configuration));
    } catch (err) {
      this.logger.error(
        colors.red(`An error occurred syncing the schema: ${debug ? err.stack : err.message}`),
      );
      this.process.exit(1);
    }

    // Indicate success
    this.logger.info(
      colors.green(
        dryRun
          ? `Dry run complete. Nothing was written to ${file}.`
          : `Successfully synced yaml file to disk at ${file}! View at ${ADMIN_DASH_INTEGRATIONS}`,
      ),
    );
  } else {
    if (!this.fs.lstatSync(file).isDirectory()) {
      throw new Error(
        'File is expected to be a folder when passing in a list of API keys to pull from. e.g. --file=./working/',
      );
    }

    const encounteredErrors: string[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind + 1}/${apiKeyOrList.length}][${apiKey.organizationName}] `;
      this.logger.info(
        colors.magenta(`~~~\n\n${prefix}Attempting to pull configuration...\n\n~~~`),
      );

      // Create a GraphQL client
      const client = buildTranscendGraphQLClient(transcendUrl, apiKey.apiKey);

      try {
        const configuration = await pullTranscendConfiguration(client, {
          dataSiloIds,
          integrationNames,
          resources: resourcesToPull,
          pageSize,
          debug,
          skipDatapoints,
          skipSubDatapoints,
          includeGuessedCategories,
          trackerStatuses,
          logger: this.logger,
        });

        const filePath = path.join(file, `${apiKey.organizationName}.yml`);
        writeConfiguration(filePath, serializeTranscendYaml(configuration));

        this.logger.info(colors.green(`${prefix}Successfully pulled configuration!`));
      } catch (err) {
        this.logger.error(colors.red(`${prefix}Failed to sync configuration. - ${err.message}`));
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

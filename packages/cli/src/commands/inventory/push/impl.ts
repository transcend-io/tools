import path from 'node:path';

import {
  buildTranscendGraphQLClient,
  fetchConsentManagerId,
  mergeTranscendInputs,
  parseTranscendYaml,
  previewPush,
  renderPushPlan,
  syncConfigurationToTranscend,
  TranscendInput,
  type PushPlan,
  type TranscendPullResource,
} from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import cliProgress from 'cli-progress';
import colors from 'colors';

import { ADMIN_DASH_INTEGRATIONS } from '../../../constants.js';
import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth, filterFileNames } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { parseVariablesFromString } from '../../../lib/helpers/parseVariablesFromString.js';
import { filterToResources } from './helpers.js';

/**
 * Sync configuration to Transcend
 *
 * @param options - Options
 * @returns True if synced successfully, false if error occurs
 */
async function syncConfiguration({
  transcendUrl,
  auth,
  pageSize,
  publishToPrivacyCenter,
  contents,
  deleteExtraAttributeValues = false,
  classifyService = false,
  logger,
}: {
  /** Transcend YAML */
  contents: TranscendInput;
  /** Transcend URL */
  transcendUrl: string;
  /** API key */
  auth: string;
  /** Page size */
  pageSize: number;
  /** Skip privacy center publish step */
  publishToPrivacyCenter: boolean;
  /** classify data flow service if missing */
  classifyService?: boolean;
  /** Delete attributes when syncing */
  deleteExtraAttributeValues?: boolean;
  /** Logger for reporting sync progress and errors */
  logger: LocalContext['logger'];
}): Promise<boolean> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);

  // Sync to Transcend
  try {
    const result = await syncConfigurationToTranscend(contents, client, {
      pageSize,
      publishToPrivacyCenter,
      classifyService,
      deleteExtraAttributeValues,
      logger,
      progressReporter: new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic),
    });
    if (!result.success) {
      result.errors.forEach(({ resource, item, message }) => {
        logger.error(
          colors.red(`Failed to sync ${resource}${item ? ` "${item}"` : ''}: ${message}`),
        );
      });
    }
    return result.success;
  } catch (err) {
    logger.error(colors.red(`An unexpected error occurred syncing the schema: ${err.message}`));
    return false;
  }
}

/**
 * Work out what a push would change by pulling the current state of the organization
 * and comparing it with the file. Nothing is written.
 *
 * @param options - Options
 * @returns The plan
 */
async function previewConfiguration({
  transcendUrl,
  auth,
  pageSize,
  contents,
  deleteExtraAttributeValues,
}: {
  /** Transcend YAML */
  contents: TranscendInput;
  /** Transcend URL */
  transcendUrl: string;
  /** API key */
  auth: string;
  /** Page size */
  pageSize: number;
  /** Delete attribute values missing from the file */
  deleteExtraAttributeValues: boolean;
}): Promise<PushPlan> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  return previewPush(client, contents, { pageSize, deleteExtraAttributeValues });
}

/**
 * Stop unless the organization behind the API key has the expected consent manager bundle id.
 * This protects CI from pushing a file with the API key of the wrong organization.
 *
 * @param options - Options
 * @throws When the id differs, or the organization has no consent manager
 */
async function assertExpectedBundleId({
  transcendUrl,
  auth,
  expectBundleId,
}: {
  /** Transcend URL */
  transcendUrl: string;
  /** API key */
  auth: string;
  /** The bundle id the organization must have */
  expectBundleId: string;
}): Promise<void> {
  const client = buildTranscendGraphQLClient(transcendUrl, auth);
  let actual: string;
  try {
    actual = await fetchConsentManagerId(client);
  } catch (err) {
    throw new Error(
      `Could not read the consent manager bundle id for this API key, so --expectBundleId=${expectBundleId} cannot be checked. ` +
        `The organization may have no consent manager. Nothing was pushed. Details: ${err.message}`,
    );
  }
  if (actual !== expectBundleId) {
    throw new Error(
      `The consent manager bundle id of this organization is ${actual}, but --expectBundleId expects ${expectBundleId}. ` +
        'The API key may belong to a different organization. Nothing was pushed.',
    );
  }
}

export interface PushCommandFlags {
  auth: string;
  file: string;
  transcendUrl: string;
  pageSize: number;
  variables: string;
  publishToPrivacyCenter: boolean;
  classifyService: boolean;
  deleteExtraAttributeValues: boolean;
  dryRun: boolean;
  json: boolean;
  expectBundleId?: string;
  resources?: TranscendPullResource[];
}

export async function push(
  this: LocalContext,
  {
    file = './transcend.yml',
    transcendUrl,
    auth,
    variables,
    pageSize,
    publishToPrivacyCenter,
    classifyService,
    deleteExtraAttributeValues,
    dryRun,
    json,
    expectBundleId,
    resources,
  }: PushCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // Parse authentication as API key or path to list of API keys
  const apiKeyOrList = await validateTranscendAuth(auth, this);

  if (expectBundleId !== undefined && typeof apiKeyOrList !== 'string') {
    throw new Error(
      '--expectBundleId cannot be used with a list of API keys, because one bundle id cannot match many organizations. Push to one organization at a time.',
    );
  }
  if (resources && resources.length === 0) {
    throw new Error('--resources needs at least one resource name.');
  }

  const vars = parseVariablesFromString(variables);

  // check if we are being passed a list of API keys and a list of files
  let fileList: string[];
  if (Array.isArray(apiKeyOrList) && this.fs.lstatSync(file).isDirectory()) {
    fileList = filterFileNames(this.fs.readdirSync(file)).map((filePath) =>
      path.join(file, filePath),
    );
  } else {
    fileList = file.split(',');
  }

  // Ensure at least one file is parsed
  if (fileList.length < 1) {
    throw new Error('No file specified!');
  }

  // eslint-disable-next-line array-callback-return,consistent-return
  const transcendInputs = fileList.map((filePath) => {
    // Ensure yaml file exists on disk
    if (!this.fs.existsSync(filePath)) {
      this.logger.error(
        colors.red(
          `The file path does not exist on disk: ${filePath}. You can specify the filepath using --file=./examples/transcend.yml`,
        ),
      );
      this.process.exit(1);
    } else if (!json) {
      this.logger.info(colors.magenta(`Reading file "${filePath}"...`));
    }

    try {
      // Read in the yaml file and validate it's shape
      const newContents = parseTranscendYaml(
        this.fs.readFileSync(filePath, 'utf8'),
        vars,
        filePath,
      );
      if (!json) {
        this.logger.info(colors.green(`Successfully read in "${filePath}"`));
      }
      return {
        content: newContents,
        name: filePath.split('/').pop()!.replace('.yml', ''),
      };
    } catch (err) {
      this.logger.error(
        colors.red(
          `The shape of your yaml file is invalid with the following errors: ${err.message}`,
        ),
      );
      this.process.exit(1);
    }
  });

  // process a single API key
  if (typeof apiKeyOrList === 'string') {
    // if passed multiple inputs, merge them together
    const [base, ...rest] = transcendInputs.map(({ content }) => content);
    let contents = mergeTranscendInputs(base, ...rest);
    if (resources) {
      contents = filterToResources(contents, resources);
    }

    if (expectBundleId !== undefined) {
      await assertExpectedBundleId({
        transcendUrl,
        auth: apiKeyOrList,
        expectBundleId,
      });
    }

    // preview only: show what would change and stop
    if (dryRun) {
      try {
        const plan = await previewConfiguration({
          transcendUrl,
          auth: apiKeyOrList,
          contents,
          pageSize,
          deleteExtraAttributeValues,
        });
        if (json) {
          this.process.stdout.write(`${JSON.stringify({ dryRun: true, targets: [{ plan }] })}\n`);
        } else {
          this.logger.info(renderPushPlan(plan, { title: 'Push preview (nothing was changed)' }));
        }
      } catch (err) {
        this.logger.error(colors.red(`Failed to preview the push: ${err.message}`));
        this.process.exit(1);
      }
      return;
    }

    // sync the configuration
    const success = await syncConfiguration({
      transcendUrl,
      auth: apiKeyOrList,
      contents,
      publishToPrivacyCenter,
      deleteExtraAttributeValues,
      pageSize,
      classifyService: !!classifyService,
      logger: this.logger,
    });

    // exist with error code
    if (!success) {
      this.logger.info(
        colors.red(
          `Sync encountered errors. View output above for more information, or check out ${ADMIN_DASH_INTEGRATIONS}`,
        ),
      );

      this.process.exit(1);
    }
  } else {
    // if passed multiple inputs, expect them to be one per instance
    if (transcendInputs.length !== 1 && transcendInputs.length !== apiKeyOrList.length) {
      throw new Error(
        'Expected list of yml files to be equal to the list of API keys.' +
          `Got ${transcendInputs.length} YML file${
            transcendInputs.length === 1 ? '' : 's'
          } and ${apiKeyOrList.length} API key${apiKeyOrList.length === 1 ? '' : 's'}`,
      );
    }

    const encounteredErrors: string[] = [];
    const previews: {
      /** Organization the plan is for */
      organization: string;
      /** What push would do */
      plan: PushPlan;
    }[] = [];
    await mapSeries(apiKeyOrList, async (apiKey, ind) => {
      const prefix = `[${ind + 1}/${apiKeyOrList.length}][${apiKey.organizationName}] `;
      if (!dryRun) {
        this.logger.info(
          colors.magenta(`~~~\n\n${prefix}Attempting to push configuration...\n\n~~~`),
        );
      }

      // use the merged contents if 1 yml passed, else use the contents that map to that organization
      let useContents =
        transcendInputs.length === 1
          ? transcendInputs[0].content
          : transcendInputs.find((input) => input.name === apiKey.organizationName)?.content;

      // Throw error if cannot find a yml file matching that organization name
      if (!useContents) {
        this.logger.error(
          colors.red(
            `${prefix}Failed to find transcend.yml file for organization: "${apiKey.organizationName}".`,
          ),
        );
        encounteredErrors.push(apiKey.organizationName);
        return;
      }

      if (resources) {
        try {
          useContents = filterToResources(useContents, resources);
        } catch (err) {
          this.logger.error(colors.red(`${prefix}${err.message}`));
          encounteredErrors.push(apiKey.organizationName);
          return;
        }
      }

      if (dryRun) {
        try {
          const plan = await previewConfiguration({
            transcendUrl,
            auth: apiKey.apiKey,
            contents: useContents,
            pageSize,
            deleteExtraAttributeValues,
          });
          previews.push({ organization: apiKey.organizationName, plan });
          if (!json) {
            this.logger.info(
              renderPushPlan(plan, {
                title: `${prefix}Push preview (nothing was changed)`,
              }),
            );
          }
        } catch (err) {
          this.logger.error(colors.red(`${prefix}Failed to preview the push: ${err.message}`));
          encounteredErrors.push(apiKey.organizationName);
        }
        return;
      }

      const success = await syncConfiguration({
        transcendUrl,
        auth: apiKey.apiKey,
        contents: useContents,
        pageSize,
        publishToPrivacyCenter,
        deleteExtraAttributeValues,
        classifyService,
        logger: this.logger,
      });

      if (success) {
        this.logger.info(colors.green(`${prefix}Successfully pushed configuration!`));
      } else {
        this.logger.error(colors.red(`${prefix}Failed to sync configuration.`));
        encounteredErrors.push(apiKey.organizationName);
      }
    });

    if (json && dryRun) {
      this.process.stdout.write(`${JSON.stringify({ dryRun: true, targets: previews })}\n`);
    }

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

    if (dryRun) {
      return;
    }
  }

  // Indicate success
  this.logger.info(
    colors.green(`Successfully synced yaml file to Transcend! View at ${ADMIN_DASH_INTEGRATIONS}`),
  );
}

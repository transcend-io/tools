import { existsSync } from 'node:fs';

import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllCustomFunctions,
  resolveEffectiveSombraId,
  resolveExistingCustomFunction,
  resolveSombraCustomerUrl,
  syncCustomFunction,
  type CustomFunctionSyncResult,
} from '@transcend-io/sdk';
import { mapSeries } from '@transcend-io/utils';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import {
  readCustomFunctionsManifest,
  writeCustomFunctionIdsToManifest,
} from '../../../lib/custom-functions/manifest.js';
import { parseVariablesFromString } from '../../../lib/helpers/parseVariablesFromString.js';
import { logger } from '../../../logger.js';

export interface CustomFunctionsPushCommandFlags {
  auth: string;
  sombraAuth?: string;
  transcendUrl: string;
  file: string;
  variables: string;
  dryRun: boolean;
  promote: boolean;
  force: boolean;
  updateManifest: boolean;
  sombraId?: string;
}

export async function push(
  this: LocalContext,
  {
    auth,
    sombraAuth,
    transcendUrl,
    file = './transcend-functions.yml',
    variables,
    dryRun,
    promote,
    force,
    updateManifest,
    sombraId,
  }: CustomFunctionsPushCommandFlags,
): Promise<void> {
  doneInputValidation(this.process.exit);

  // This command operates on a single Transcend instance
  const apiKeyOrList = validateTranscendAuth(auth);
  if (Array.isArray(apiKeyOrList)) {
    logger.error(
      colors.red(
        'transcend custom-functions push does not support a list of API keys — pass a single API key.',
      ),
    );
    this.process.exit(1);
  }
  const apiKey = apiKeyOrList as string;

  // Read and validate the manifest
  if (!existsSync(file)) {
    logger.error(
      colors.red(
        `The manifest file does not exist on disk: ${file}. ` +
          'You can specify the file path using --file=./transcend-functions.yml',
      ),
    );
    this.process.exit(1);
  }
  const vars = parseVariablesFromString(variables);
  logger.info(colors.magenta(`Reading manifest "${file}"...`));
  const configs = readCustomFunctionsManifest(file, vars);
  logger.info(colors.green(`Found ${configs.length} custom function(s) in "${file}"`));

  const client = buildTranscendGraphQLClient(transcendUrl, apiKey);

  // Fetch existing functions once to diff against
  const existing = await fetchAllCustomFunctions(client, { logger });

  // Each custom function belongs to a single Sombra gateway whose keys sign
  // its code, so code must be signed against that specific gateway's customer
  // ingress. Cache one connection per distinct gateway across the run.
  type SombraGot = Awaited<ReturnType<typeof createSombraGotInstance>>;
  const sombraByGateway = new Map<string, SombraGot>();
  const getSombraForGateway = async (gatewaySombraId?: string): Promise<SombraGot> => {
    const key = gatewaySombraId ?? '';
    const cached = sombraByGateway.get(key);
    if (cached) {
      return cached;
    }
    logger.info(
      colors.magenta(
        `Connecting to the ${
          gatewaySombraId ? `Sombra gateway "${gatewaySombraId}"` : 'primary Sombra gateway'
        } to sign code...`,
      ),
    );
    const sombraUrl = gatewaySombraId
      ? await resolveSombraCustomerUrl(client, gatewaySombraId, { logger })
      : undefined;
    const sombra = await createSombraGotInstance(transcendUrl, apiKey, {
      logger,
      sombraApiKey: sombraAuth,
      sombraUrl,
    });
    sombraByGateway.set(key, sombra);
    return sombra;
  };

  // Sync each function in order
  const results: { name: string; result?: CustomFunctionSyncResult; error?: Error }[] = [];
  await mapSeries(configs, async (input) => {
    try {
      // Resolve the gateway this function belongs to: manifest sombra-id,
      // else the existing function's gateway, else --sombraId, else primary.
      // Also validates manifest-vs-existing gateway mismatches.
      const effectiveSombraId = resolveEffectiveSombraId(
        input,
        resolveExistingCustomFunction(existing, input),
        sombraId,
      );
      const result = await syncCustomFunction(client, {
        input,
        sombra: dryRun ? undefined : await getSombraForGateway(effectiveSombraId),
        defaultSombraId: sombraId,
        existing,
        promote,
        dryRun,
        force,
        logger,
      });
      results.push({ name: input.name, result });

      const suffix = result.versionNumber ? ` (version ${result.versionNumber})` : '';
      const changes =
        result.changedFields.length > 0 ? ` [${result.changedFields.join(', ')}]` : '';
      switch (result.outcome) {
        case 'created':
          logger.info(colors.green(`Created custom function "${input.name}"${suffix}`));
          break;
        case 'updated':
          logger.info(
            colors.green(
              `Pushed new revision to "${input.name}"${suffix}${changes}${
                result.promoted ? ' and promoted to active' : ' as a draft'
              }`,
            ),
          );
          break;
        case 'skipped':
          logger.info(colors.yellow(`Skipped "${input.name}" — no changes detected`));
          break;
        case 'would-create':
          logger.info(colors.cyan(`[dry run] Would create custom function "${input.name}"`));
          break;
        case 'would-update':
          logger.info(
            colors.cyan(`[dry run] Would push a new revision to "${input.name}"${changes}`),
          );
          break;
      }
    } catch (err) {
      results.push({ name: input.name, error: err as Error });
      logger.error(
        colors.red(`Failed to sync custom function "${input.name}": ${(err as Error).message}`),
      );
    }
  });

  // Write assigned IDs back into the manifest so future pushes match by ID
  // instead of by (potentially non-unique) name
  if (updateManifest && !dryRun) {
    const idsByIndex = configs.map((input, index) =>
      input.id ? undefined : results[index]?.result?.customFunctionId,
    );
    const updatedCount = writeCustomFunctionIdsToManifest(file, idsByIndex);
    if (updatedCount > 0) {
      logger.info(
        colors.green(
          `Wrote ${updatedCount} custom function id(s) back to "${file}" — commit this change so future pushes match by ID.`,
        ),
      );
    }
  }

  // Summarize
  const count = (outcome: CustomFunctionSyncResult['outcome']): number =>
    results.filter(({ result }) => result?.outcome === outcome).length;
  const failures = results.filter(({ error }) => error !== undefined);
  logger.info(
    colors.magenta(
      `Custom function sync complete: ${count('created') + count('would-create')} created, ${
        count('updated') + count('would-update')
      } updated, ${count('skipped')} skipped, ${failures.length} failed${dryRun ? ' (dry run)' : ''}`,
    ),
  );

  if (failures.length > 0) {
    this.process.exit(1);
  }
}

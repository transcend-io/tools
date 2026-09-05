import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllCustomFunctions,
  resolveEffectiveSombraId,
  resolveExistingCustomFunction,
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

export interface CustomFunctionsPushCommandFlags {
  auth: string;
  sombraAuth?: string;
  transcendUrl: string;
  file: string;
  variables: string;
  dryRun: boolean;
  promote: boolean;
  force: boolean;
  skipTests: boolean;
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
    skipTests,
    updateManifest,
    sombraId,
  }: CustomFunctionsPushCommandFlags,
): Promise<void> {
  doneInputValidation(this.process);

  // This command operates on a single Transcend instance
  const apiKeyOrList = validateTranscendAuth(auth, {
    fs: this.fs,
    exit: this.process.exit,
    logger: this.logger,
  });
  if (Array.isArray(apiKeyOrList)) {
    this.logger.error(
      colors.red(
        'transcend custom-functions push does not support a list of API keys — pass a single API key.',
      ),
    );
    this.process.exit(1);
  }
  const apiKey = apiKeyOrList as string;

  // Read and validate the manifest
  if (!this.fs.existsSync(file)) {
    this.logger.error(
      colors.red(
        `The manifest file does not exist on disk: ${file}. ` +
          'You can specify the file path using --file=./transcend-functions.yml',
      ),
    );
    this.process.exit(1);
  }
  const vars = parseVariablesFromString(variables);
  this.logger.info(colors.magenta(`Reading manifest "${file}"...`));
  const configs = readCustomFunctionsManifest(file, vars);
  this.logger.info(colors.green(`Found ${configs.length} custom function(s) in "${file}"`));

  const client = buildTranscendGraphQLClient(transcendUrl, apiKey);

  // Fetch existing functions once to diff against
  const existing = await fetchAllCustomFunctions(client, { logger: this.logger });

  // Each custom function belongs to a single Sombra gateway whose keys sign
  // its code, so code must be signed against that specific gateway's customer
  // ingress. Cache one connection per distinct gateway + internal key across
  // the run.
  type SombraGot = Awaited<ReturnType<typeof createSombraGotInstance>>;
  const sombraByGateway = new Map<string, SombraGot>();
  const getSombraForGateway = async (
    gatewaySombraId: string | undefined,
    sombraApiKey: string | undefined,
  ): Promise<SombraGot> => {
    const key = `${gatewaySombraId ?? ''}\u0000${sombraApiKey ?? ''}`;
    const cached = sombraByGateway.get(key);
    if (cached) {
      return cached;
    }
    this.logger.info(
      colors.magenta(
        `Connecting to the ${
          gatewaySombraId ? `Sombra gateway "${gatewaySombraId}"` : 'primary Sombra gateway'
        } to sign code...`,
      ),
    );
    const sombra = await createSombraGotInstance(transcendUrl, apiKey, {
      logger: this.logger,
      sombraApiKey,
      ...(gatewaySombraId ? { sombraId: gatewaySombraId } : {}),
    });
    sombraByGateway.set(key, sombra);
    return sombra;
  };

  /**
   * Resolve the Sombra internal key for a manifest entry: the env variable
   * named by `sombra-auth-env` when set (which must be exported), else the
   * `--sombraAuth` flag.
   *
   * @param input - The manifest entry
   * @returns The internal key to authenticate with, if any
   */
  const resolveEntrySombraAuth = (input: {
    /** Function name, for error messages */
    name: string;
    /** Env variable name holding the gateway's internal key */
    sombraAuthEnv?: string;
  }): string | undefined => {
    if (!input.sombraAuthEnv) {
      return sombraAuth;
    }
    const value = this.process.env[input.sombraAuthEnv];
    if (!value) {
      throw new Error(
        `Custom function "${input.name}" sets sombra-auth-env: ${input.sombraAuthEnv}, ` +
          'but that environment variable is not set. Export it (e.g. from a CI secret) ' +
          'before pushing.',
      );
    }
    return value;
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
        sombra: dryRun
          ? undefined
          : await getSombraForGateway(effectiveSombraId, resolveEntrySombraAuth(input)),
        defaultSombraId: sombraId,
        existing,
        promote,
        dryRun,
        force,
        // Test the freshly signed code before pushing; every payload must
        // pass or the function is rejected. Dry runs never sign, so nothing
        // is tested either.
        ...(!skipTests && input.testPayloads !== undefined
          ? { testPayloads: input.testPayloads }
          : {}),
        logger: this.logger,
      });
      results.push({ name: input.name, result });

      const suffix = result.versionNumber ? ` (version ${result.versionNumber})` : '';
      const changes =
        result.changedFields.length > 0 ? ` [${result.changedFields.join(', ')}]` : '';
      switch (result.outcome) {
        case 'created':
          if (result.createdDataSilo && result.dataSiloId) {
            this.logger.info(
              colors.green(
                `Created DSR integration (data silo ${result.dataSiloId}) for "${input.name}"`,
              ),
            );
          }
          this.logger.info(colors.green(`Created custom function "${input.name}"${suffix}`));
          break;
        case 'updated':
          this.logger.info(
            colors.green(
              `Pushed new revision to "${input.name}"${suffix}${changes}${
                result.promoted ? ' and promoted to active' : ' as a draft'
              }`,
            ),
          );
          break;
        case 'metadata-updated':
          this.logger.info(
            colors.green(
              `Updated metadata for "${input.name}"${changes} — code unchanged, no new revision`,
            ),
          );
          break;
        case 'skipped':
          this.logger.info(
            colors.yellow(
              `Skipped "${input.name}" — no changes detected ` +
                '(env variable values cannot be diffed; use --force if only values changed)',
            ),
          );
          break;
        case 'would-create':
          this.logger.info(
            colors.cyan(
              `[dry run] Would create custom function "${input.name}"${
                input.type === CustomFunctionType.Dsr && !input.dataSiloId
                  ? ' and its DSR integration (data silo)'
                  : ''
              }`,
            ),
          );
          break;
        case 'would-update':
          this.logger.info(
            colors.cyan(`[dry run] Would push a new revision to "${input.name}"${changes}`),
          );
          break;
        case 'test-failed': {
          const failed = (result.testResults ?? []).filter(({ passed }) => !passed);
          this.logger.error(
            colors.red(
              `Rejected "${input.name}" — ${failed.length} of ${
                result.testResults?.length ?? 0
              } test run(s) failed`,
            ),
          );
          failed.forEach(({ payloadType, result: execution }) => {
            const label = payloadType ? `[${payloadType}] ` : '';
            this.logger.error(
              colors.red(
                `  ${label}${
                  execution.error
                    ? execution.error.message
                    : `failed with exit code ${execution.exitCode}`
                }`,
              ),
            );
            execution.logs.forEach(({ file: logFile, message }) => {
              this.logger.error(colors.red(`    [${logFile}] ${message}`));
            });
          });
          if (result.createdDataSilo) {
            this.logger.error(
              colors.red(
                `  The DSR integration (data silo) created for "${input.name}" was rolled back.`,
              ),
            );
          }
          break;
        }
      }

      // Anything that reached the push path without a test payload was
      // promoted untested — call it out so payloads get added over time
      if (
        !skipTests &&
        (input.testPayloads === undefined || input.testPayloads.length === 0) &&
        (result.outcome === 'created' || result.outcome === 'updated')
      ) {
        this.logger.warn(
          colors.yellow(
            `Custom function "${input.name}" was pushed without a test run — add a ` +
              'test-payload to its manifest entry to enable test-before-promote.',
          ),
        );
      }

      // DSR functions have two entry points (default export = DATA_POINT,
      // enricher export = REQUEST_ENRICHER); nudge toward covering both
      if (
        !skipTests &&
        input.type === CustomFunctionType.Dsr &&
        input.testPayloads !== undefined &&
        input.testPayloads.length > 0 &&
        (result.outcome === 'created' || result.outcome === 'updated')
      ) {
        const coveredTypes = new Set(
          input.testPayloads.map(
            ({ payloadType }) => payloadType ?? CustomFunctionPayloadType.DataPoint,
          ),
        );
        if (coveredTypes.size === 1) {
          const [covered] = coveredTypes;
          const uncovered =
            covered === CustomFunctionPayloadType.DataPoint
              ? CustomFunctionPayloadType.RequestEnricher
              : CustomFunctionPayloadType.DataPoint;
          this.logger.warn(
            colors.yellow(
              `DSR custom function "${input.name}" only tests its ${covered} export — if it ` +
                `also implements the ${uncovered} export, add a test payload with ` +
                `payload-type: ${uncovered} so both entry points are tested on every push.`,
            ),
          );
        }
      }
    } catch (err) {
      results.push({ name: input.name, error: err as Error });
      this.logger.error(
        colors.red(`Failed to sync custom function "${input.name}": ${(err as Error).message}`),
      );
    }
  });

  // Write assigned IDs back into the manifest so future pushes match by ID
  // instead of by (potentially non-unique) name, and DSR entries keep
  // pointing at their (possibly auto-created) integration
  if (updateManifest && !dryRun) {
    const idsByIndex = configs.map((input, index) => {
      const result = results[index]?.result;
      if (!result) {
        return undefined;
      }
      const ids = {
        ...(!input.id && result.customFunctionId ? { id: result.customFunctionId } : {}),
        ...(!input.dataSiloId && result.dataSiloId ? { dataSiloId: result.dataSiloId } : {}),
      };
      return Object.keys(ids).length > 0 ? ids : undefined;
    });
    const updatedCount = writeCustomFunctionIdsToManifest(file, idsByIndex);
    if (updatedCount > 0) {
      this.logger.info(
        colors.green(
          `Wrote assigned id(s) back to ${updatedCount} manifest entr(ies) in "${file}" — ` +
            'commit this change so future pushes match by ID.',
        ),
      );
    }
  }

  // Summarize
  const count = (outcome: CustomFunctionSyncResult['outcome']): number =>
    results.filter(({ result }) => result?.outcome === outcome).length;
  const failures = results.filter(({ error }) => error !== undefined);
  const rejected = count('test-failed');
  this.logger.info(
    colors.magenta(
      `Custom function sync complete: ${count('created') + count('would-create')} created, ${
        count('updated') + count('would-update')
      } updated, ${count('metadata-updated')} metadata-only, ${count(
        'skipped',
      )} skipped, ${rejected} rejected (test failed), ${failures.length} failed${
        dryRun ? ' (dry run)' : ''
      }`,
    ),
  );

  if (failures.length > 0 || rejected > 0) {
    this.process.exit(1);
  }
}

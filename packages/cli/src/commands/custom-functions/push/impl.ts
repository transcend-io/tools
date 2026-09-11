import { CustomFunctionPayloadType, CustomFunctionType } from '@transcend-io/privacy-types';
import {
  buildTranscendGraphQLClient,
  createSombraGotInstance,
  fetchAllCustomFunctions,
  NOOP_LOGGER,
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
import { buildCustomFunctionPushJsonResult } from '../../../lib/custom-functions/command-output.js';
import {
  readCustomFunctionsManifest,
  writeCustomFunctionIdsToManifest,
} from '../../../lib/custom-functions/manifest.js';
import { formatMissingManifestMessage } from '../../../lib/custom-functions/missing-manifest.js';
import { resolveCustomFunctionProjectPaths } from '../../../lib/custom-functions/paths.js';
import { discoverCustomFunctionManifests } from '../../../lib/custom-functions/project-discovery.js';
import { parseVariablesFromString } from '../../../lib/helpers/parseVariablesFromString.js';
import { assertPathPhysicallyContained } from '../../../lib/scaffolding/path-safety.js';

export interface CustomFunctionsPushCommandFlags {
  /** Transcend API key. */
  auth: string;
  /** Optional Sombra internal key. */
  sombraAuth?: string;
  /** Transcend backend URL. */
  transcendUrl: string;
  /** Explicit manifest path. */
  manifest?: string;
  /** Manifest variable substitutions. */
  variables: string;
  /** Preview remote changes without applying them. */
  dryRun: boolean;
  /** Emit stable JSON output. */
  json: boolean;
  /** Promote new revisions to active. */
  promote: boolean;
  /** Push even when no changes can be detected. */
  force: boolean;
  /** Skip test payload execution. */
  skipTests: boolean;
  /** Write assigned IDs back to the manifest. */
  updateManifest: boolean;
  /** Default Sombra gateway ID. */
  sombraId?: string;
}

export async function push(
  this: LocalContext,
  {
    auth,
    sombraAuth,
    transcendUrl,
    manifest,
    variables,
    dryRun,
    json,
    promote,
    force,
    skipTests,
    updateManifest,
    sombraId,
  }: CustomFunctionsPushCommandFlags,
  directory?: string,
): Promise<void> {
  doneInputValidation(this.process);

  const cwd = this.process.cwd();
  const { manifestDirectory, manifestPath } = resolveCustomFunctionProjectPaths(cwd, {
    ...(directory ? { directory } : {}),
    ...(manifest ? { manifest } : {}),
  });

  // Read and validate the manifest before performing auth or network setup.
  if (!this.fs.existsSync(manifestPath)) {
    const message = formatMissingManifestMessage({
      cwd,
      manifestPath,
      discoveredManifestPaths: discoverCustomFunctionManifests(this, cwd),
      command: 'push',
    });
    this.logger.error(colors.red(message));
    this.process.exit(1);
  }

  // This command operates on a single Transcend instance
  const apiKeyOrList = validateTranscendAuth(auth, this);
  if (Array.isArray(apiKeyOrList)) {
    this.logger.error(
      colors.red(
        'transcend custom-functions push does not support a list of API keys — pass a single API key.',
      ),
    );
    this.process.exit(1);
  }
  const apiKey = apiKeyOrList as string;
  const commandLogger = json ? NOOP_LOGGER : this.logger;

  const vars = parseVariablesFromString(variables);
  commandLogger.info(colors.magenta(`Reading manifest "${manifestPath}"...`));
  const configs = readCustomFunctionsManifest(manifestPath, vars, (path) =>
    assertPathPhysicallyContained(this, manifestDirectory, path),
  );
  commandLogger.info(
    colors.green(`Found ${configs.length} custom function(s) in "${manifestPath}"`),
  );

  const client = buildTranscendGraphQLClient(transcendUrl, apiKey);

  // Fetch existing functions once to diff against
  const existing = await fetchAllCustomFunctions(client, { logger: commandLogger });

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
    commandLogger.info(
      colors.magenta(
        `Connecting to the ${
          gatewaySombraId ? `Sombra gateway "${gatewaySombraId}"` : 'primary Sombra gateway'
        } to sign code...`,
      ),
    );
    const sombra = await createSombraGotInstance(transcendUrl, apiKey, {
      logger: commandLogger,
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
        logger: commandLogger,
      });
      results.push({ name: input.name, result });

      const suffix = result.versionNumber ? ` (version ${result.versionNumber})` : '';
      const changes =
        result.changedFields.length > 0 ? ` [${result.changedFields.join(', ')}]` : '';
      switch (result.outcome) {
        case 'created':
          if (result.createdDataSilo && result.dataSiloId) {
            commandLogger.info(
              colors.green(
                `Created DSR integration (data silo ${result.dataSiloId}) for "${input.name}"`,
              ),
            );
          }
          commandLogger.info(colors.green(`Created custom function "${input.name}"${suffix}`));
          break;
        case 'updated':
          commandLogger.info(
            colors.green(
              `Pushed new revision to "${input.name}"${suffix}${changes}${
                result.promoted ? ' and promoted to active' : ' as a draft'
              }`,
            ),
          );
          break;
        case 'metadata-updated':
          commandLogger.info(
            colors.green(
              `Updated metadata for "${input.name}"${changes} — code unchanged, no new revision`,
            ),
          );
          break;
        case 'skipped':
          commandLogger.info(
            colors.yellow(
              `Skipped "${input.name}" — no changes detected ` +
                '(env variable values cannot be diffed; use --force if only values changed)',
            ),
          );
          break;
        case 'would-create':
          commandLogger.info(
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
          commandLogger.info(
            colors.cyan(`[dry run] Would push a new revision to "${input.name}"${changes}`),
          );
          break;
        case 'test-failed': {
          const failed = (result.testResults ?? []).filter(({ passed }) => !passed);
          commandLogger.error(
            colors.red(
              `Rejected "${input.name}" — ${failed.length} of ${
                result.testResults?.length ?? 0
              } test run(s) failed`,
            ),
          );
          failed.forEach(({ payloadType, result: execution }) => {
            const label = payloadType ? `[${payloadType}] ` : '';
            commandLogger.error(
              colors.red(
                `  ${label}${
                  execution.error
                    ? execution.error.message
                    : `failed with exit code ${execution.exitCode}`
                }`,
              ),
            );
            execution.logs.forEach(({ file: logFile, message }) => {
              commandLogger.error(colors.red(`    [${logFile}] ${message}`));
            });
          });
          if (result.createdDataSilo) {
            commandLogger.error(
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
        commandLogger.warn(
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
          commandLogger.warn(
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
      commandLogger.error(
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
    const updatedCount = writeCustomFunctionIdsToManifest(manifestPath, idsByIndex);
    if (updatedCount > 0) {
      commandLogger.info(
        colors.green(
          `Wrote assigned id(s) back to ${updatedCount} manifest entr(ies) in "${manifestPath}" — ` +
            'commit this change so future pushes match by ID.',
        ),
      );
    }
  }

  const output = buildCustomFunctionPushJsonResult(manifestPath, dryRun, results);
  if (json) {
    this.process.stdout.write(`${JSON.stringify(output)}\n`);
  } else {
    const { summary } = output;
    commandLogger.info(
      colors.magenta(
        `Custom function sync complete: ${summary.created} created, ${summary.updated} updated, ` +
          `${summary.metadataUpdated} metadata-only, ${summary.skipped} skipped, ` +
          `${summary.rejected} rejected (test failed), ${summary.failed} failed${
            dryRun ? ' (dry run)' : ''
          }`,
      ),
    );
  }

  if (output.status === 'failed') {
    this.process.exit(1);
  }
}

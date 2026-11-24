import { dirname, join } from 'node:path';

import { buildTranscendGraphQLClient, fetchAllCustomFunctions } from '@transcend-io/sdk';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { selectCommandLogger } from '../../../lib/cli/command-output.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { resolveCustomFunctionProjectPaths } from '../../../lib/custom-functions/paths.js';
import {
  buildCustomFunctionPullPlan,
  mergeCustomFunctionPullIntoManifest,
} from '../../../lib/custom-functions/pullRemote.js';
import { CUSTOM_FUNCTION_RESULT_VERSION } from '../../../lib/custom-functions/scaffold-model.js';

export interface CustomFunctionsPullCommandFlags {
  /** Transcend API key. */
  auth: string;
  /** Transcend backend URL. */
  transcendUrl: string;
  /** Path to transcend-functions.yml. */
  manifest?: string;
  /** Overwrite source files and settings of functions already in the manifest. */
  force: boolean;
  /** Keep the source organization's function, data silo, and Sombra IDs. */
  includeIds: boolean;
  /** Emit stable JSON output. */
  json: boolean;
}

export async function pull(
  this: LocalContext,
  flags: CustomFunctionsPullCommandFlags,
  directory?: string,
): Promise<void> {
  doneInputValidation(this.process);

  const apiKeyOrList = validateTranscendAuth(flags.auth, this);
  if (Array.isArray(apiKeyOrList)) {
    this.logger.error(
      colors.red(
        'transcend custom-functions pull does not support a list of API keys. Pass a single API key.',
      ),
    );
    this.process.exit(1);
  }

  const { manifestPath, manifestDirectory } = resolveCustomFunctionProjectPaths(
    this.process.cwd(),
    {
      directory,
      manifest: flags.manifest,
    },
  );

  const client = buildTranscendGraphQLClient(flags.transcendUrl, apiKeyOrList as string);
  const commandLogger = selectCommandLogger(this.logger, flags.json);
  const remote = await fetchAllCustomFunctions(client, { logger: commandLogger });
  const plan = buildCustomFunctionPullPlan(remote, { includeIds: flags.includeIds });

  const existingContents = this.fs.existsSync(manifestPath)
    ? this.fs.readFileSync(manifestPath, 'utf-8')
    : undefined;
  const merged = mergeCustomFunctionPullIntoManifest(existingContents, plan, {
    force: flags.force,
  });

  const blocked = merged.files
    .filter(({ isNew, path }) => isNew && this.fs.existsSync(join(manifestDirectory, path)))
    .map(({ path }) => path);
  if (blocked.length > 0 && !flags.force) {
    this.logger.error(
      colors.red(
        `Refusing to overwrite files not tracked by the manifest without --force: ${blocked.join(', ')}`,
      ),
    );
    this.process.exit(1);
  }

  for (const file of merged.files) {
    const absolutePath = join(manifestDirectory, file.path);
    this.fs.mkdirSync(dirname(absolutePath), { recursive: true });
    this.fs.writeFileSync(absolutePath, file.contents, 'utf-8');
  }
  if (merged.added.length > 0 || merged.updated.length > 0) {
    this.fs.mkdirSync(dirname(manifestPath), { recursive: true });
    this.fs.writeFileSync(manifestPath, merged.contents, 'utf-8');
  }

  if (flags.json) {
    this.process.stdout.write(
      `${JSON.stringify({
        version: CUSTOM_FUNCTION_RESULT_VERSION,
        command: 'pull',
        manifestPath,
        added: merged.added,
        updated: merged.updated,
        kept: merged.kept,
        skipped: plan.skipped,
        duplicateNames: plan.duplicateNames,
        variables: plan.variables,
        files: merged.files.map(({ path }) => path),
      })}\n`,
    );
    return;
  }

  if (remote.length === 0) {
    this.logger.info(colors.yellow('No custom functions found in this organization.'));
    return;
  }

  this.logger.info(
    colors.green(
      `Pulled into ${manifestPath}: ${merged.added.length} added, ${merged.updated.length} updated, ` +
        `${merged.kept.length} unchanged.`,
    ),
  );
  if (merged.kept.length > 0 && !flags.force) {
    this.logger.info(
      `Already in the manifest (re-run with --force to overwrite): ${merged.kept.join(', ')}`,
    );
  }
  if (plan.duplicateNames.length > 0) {
    this.logger.warn(
      colors.yellow(
        `Skipped functions that share a name: ${plan.duplicateNames.join(', ')}. ` +
          'Rename them in the source organization, or re-run with --includeIds for a same-org copy.',
      ),
    );
  }
  if (plan.skipped.length > 0) {
    this.logger.warn(
      colors.yellow(
        `Skipped ${plan.skipped.length} function(s) with undecodable code: ${plan.skipped.join(', ')}`,
      ),
    );
  }
  if (plan.variables.length > 0) {
    this.logger.warn(
      colors.yellow(
        'Env values are encrypted and were not pulled. Supply them on push with ' +
          `--variables=${plan.variables.map((name) => `${name}:...`).join(',')}`,
      ),
    );
  }
}

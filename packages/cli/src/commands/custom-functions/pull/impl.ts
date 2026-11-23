import { join } from 'node:path';

import { buildTranscendGraphQLClient, fetchAllCustomFunctions } from '@transcend-io/sdk';
import colors from 'colors';
import yaml from 'js-yaml';

import type { LocalContext } from '../../../context.js';
import { validateTranscendAuth } from '../../../lib/api-keys/index.js';
import { selectCommandLogger } from '../../../lib/cli/command-output.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import type { CustomFunctionsManifest } from '../../../lib/custom-functions/manifest.js';
import { resolveCustomFunctionProjectPaths } from '../../../lib/custom-functions/paths.js';
import { buildCustomFunctionPullPlan } from '../../../lib/custom-functions/pullRemote.js';
import { CUSTOM_FUNCTION_RESULT_VERSION } from '../../../lib/custom-functions/scaffold-model.js';

export interface CustomFunctionsPullCommandFlags {
  /** Transcend API key. */
  auth: string;
  /** Transcend backend URL. */
  transcendUrl: string;
  /** Path to transcend-functions.yml. */
  manifest?: string;
  /** Overwrite existing manifest and code files. */
  force: boolean;
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
        'transcend custom-functions pull does not support a list of API keys — pass a single API key.',
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
  const plan = buildCustomFunctionPullPlan(remote);

  if (flags.json) {
    this.process.stdout.write(
      `${JSON.stringify({
        version: CUSTOM_FUNCTION_RESULT_VERSION,
        command: 'pull',
        manifestPath,
        functionCount: plan.functions.length,
        skipped: plan.skipped,
        hasEncryptedEnv: plan.hasEncryptedEnv,
        files: plan.files.map(({ path }) => path),
      })}\n`,
    );
    return;
  }

  if (plan.functions.length === 0) {
    this.logger.info(colors.yellow('No custom functions found in this organization.'));
    return;
  }

  if (!flags.force && this.fs.existsSync(manifestPath)) {
    this.logger.error(
      colors.red(
        `Manifest already exists at ${manifestPath}. Re-run with --force to overwrite manifest and source files.`,
      ),
    );
    this.process.exit(1);
  }

  this.fs.mkdirSync(join(manifestDirectory, 'functions'), { recursive: true });
  for (const file of plan.files) {
    const absolutePath = join(manifestDirectory, file.path);
    if (!flags.force && this.fs.existsSync(absolutePath)) {
      this.logger.error(colors.red(`Refusing to overwrite ${file.path} without --force.`));
      this.process.exit(1);
    }
    this.fs.writeFileSync(absolutePath, file.contents, 'utf-8');
  }

  const manifest: CustomFunctionsManifest = { functions: plan.functions };
  this.fs.writeFileSync(manifestPath, yaml.dump(manifest), 'utf-8');

  this.logger.info(
    colors.green(
      `Wrote ${plan.functions.length} custom function(s) to ${manifestPath} (${plan.files.length} source file(s)).`,
    ),
  );
  if (plan.skipped.length > 0) {
    this.logger.warn(
      colors.yellow(
        `Skipped ${plan.skipped.length} function(s) with undecodable code: ${plan.skipped.join(', ')}`,
      ),
    );
  }
  if (plan.hasEncryptedEnv) {
    this.logger.warn(
      colors.yellow(
        'Encrypted environment variable values are not included in a pull. Set env values locally before push.',
      ),
    );
  }
}

import { dirname, join, relative } from 'node:path';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { runCustomFunctionChecks } from '../shared/check.js';
import {
  DEFAULT_CUSTOM_FUNCTION_DIRECTORY,
  discoverCustomFunctionManifests,
  resolveCliPath,
} from '../shared/discovery.js';
import { CustomFunctionPrompts, PromptCancelledError } from '../shared/prompts.js';
import { isInteractiveInvocation } from '../shared/scaffold.js';

/** CLI flags for `transcend custom-functions check`. */
export interface CustomFunctionsCheckFlags {
  /** Explicit manifest path. */
  manifest?: string;
  /** Apply Deno formatting. */
  fix: boolean;
  /** Disable prompts. */
  noInteractive: boolean;
  /** Emit JSON on stdout. */
  json: boolean;
}

/**
 * Build an actionable diagnostic for a missing manifest.
 *
 * @param context - CLI context
 * @param manifestPath - Requested manifest
 * @param cwd - Command working directory
 * @returns Missing-manifest explanation
 */
function missingManifestMessage(context: LocalContext, manifestPath: string, cwd: string): string {
  const requested = relative(cwd, manifestPath) || 'transcend-functions.yml';
  const discovered = discoverCustomFunctionManifests(context, cwd).filter(
    (candidate) => candidate !== manifestPath,
  );
  if (discovered.length === 1) {
    const directory = relative(cwd, dirname(discovered[0]!)) || '.';
    const argument = /\s/u.test(directory) ? JSON.stringify(directory) : directory;
    return (
      `Custom Function manifest does not exist at ${requested}. ` +
      `Did you mean \`transcend custom-functions check ${argument}\`?`
    );
  }
  if (discovered.length > 1) {
    const paths = discovered.map((path) => relative(cwd, path)).join(', ');
    return (
      `Custom Function manifest does not exist at ${requested}. ` +
      `Found manifests at: ${paths}. Pass a directory or --manifest explicitly.`
    );
  }
  return (
    `Custom Function manifest does not exist at ${requested}. ` +
    'Run `transcend custom-functions init` to create the default project.'
  );
}

/**
 * Validate a local Custom Function project without credentials.
 *
 * @param this - CLI context
 * @param flags - Check and interaction flags
 * @param directory - Optional target directory
 */
export async function check(
  this: LocalContext,
  flags: CustomFunctionsCheckFlags,
  directory?: string,
): Promise<void> {
  doneInputValidation(this.process);
  const targetDirectory = resolveCliPath(
    this.process.cwd(),
    directory ?? DEFAULT_CUSTOM_FUNCTION_DIRECTORY,
  );
  const manifestPath = flags.manifest
    ? resolveCliPath(this.process.cwd(), flags.manifest)
    : join(targetDirectory, 'transcend-functions.yml');
  const missingMessage = this.fs.existsSync(manifestPath)
    ? undefined
    : missingManifestMessage(this, manifestPath, this.process.cwd());
  const interactive = isInteractiveInvocation(this, {
    json: flags.json,
    noInteractive: flags.noInteractive,
  });
  const prompts = new CustomFunctionPrompts(this);
  try {
    const result = await runCustomFunctionChecks(this, {
      manifestPath,
      fix: flags.fix,
      ...(interactive && !flags.fix
        ? {
            confirmFormat: async (patch: string): Promise<boolean> => {
              if (patch) {
                this.logger.error(patch);
              }
              return prompts.confirm('Format the files shown above?', true);
            },
          }
        : {}),
    });
    if (missingMessage) {
      result.diagnostics.forEach((diagnostic) => {
        if (diagnostic.code === 'manifest.missing') {
          diagnostic.message = missingMessage;
        }
      });
    }
    if (flags.json) {
      this.process.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      result.checks.forEach(({ name, status }) => {
        this.logger.info(`${status.padEnd(7)} ${name}`);
      });
      result.diagnostics.forEach((diagnostic) => {
        const location = diagnostic.path ? `${diagnostic.path}: ` : '';
        const owner = diagnostic.functionName ? `[${diagnostic.functionName}] ` : '';
        this.logger.error(`${diagnostic.severity}: ${location}${owner}${diagnostic.message}`);
      });
      if (result.status === 'passed') {
        this.logger.info('Custom Function checks passed.');
      }
    }
    if (result.status === 'failed') {
      this.process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}

import { join } from 'node:path';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { formatMissingManifestMessage } from '../../../lib/custom-functions/missing-manifest.js';
import {
  DEFAULT_CUSTOM_FUNCTION_DIRECTORY,
  resolveCliPath,
} from '../../../lib/custom-functions/paths.js';
import { discoverCustomFunctionManifests } from '../project-discovery.js';
import { CustomFunctionPrompts, PromptCancelledError } from '../prompts.js';
import { runCustomFunctionChecks } from './runner.js';

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
    : formatMissingManifestMessage({
        cwd: this.process.cwd(),
        manifestPath,
        discoveredManifestPaths: discoverCustomFunctionManifests(this, this.process.cwd()),
        command: 'check',
      });
  const interactive =
    !flags.json &&
    !flags.noInteractive &&
    Boolean(this.process.stdin.isTTY && this.process.stderr.isTTY);
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

import { join } from 'node:path';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { runCustomFunctionChecks } from '../shared/check.js';
import { resolveCliPath } from '../shared/discovery.js';
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
  const targetDirectory = resolveCliPath(this.process.cwd(), directory ?? '.');
  const manifestPath = flags.manifest
    ? resolveCliPath(this.process.cwd(), flags.manifest)
    : join(targetDirectory, 'transcend-functions.yml');
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

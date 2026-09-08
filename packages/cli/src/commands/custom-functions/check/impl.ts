import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { formatMissingManifestMessage } from '../../../lib/custom-functions/missing-manifest.js';
import { resolveCustomFunctionProjectPaths } from '../../../lib/custom-functions/paths.js';
import { discoverCustomFunctionManifests } from '../../../lib/custom-functions/project-discovery.js';
import {
  CustomFunctionPrompts,
  PromptCancelledError,
} from '../../../lib/custom-functions/prompts.js';
import { runCustomFunctionChecks } from './helpers.js';

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
  const { manifestPath } = resolveCustomFunctionProjectPaths(this.process.cwd(), {
    ...(directory ? { directory } : {}),
    ...(flags.manifest ? { manifest: flags.manifest } : {}),
  });
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
      includeFormatPatchInDiagnostics: !flags.json,
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
      this.logger.info(`${colors.bold('Custom Function checks')}\n`);
      result.checks.forEach(({ name, status }) => {
        const label = status === 'passed' ? 'PASS' : status === 'failed' ? 'FAIL' : 'SKIP';
        const styledLabel =
          status === 'passed'
            ? colors.green(label)
            : status === 'failed'
              ? colors.red(label)
              : colors.yellow(label);
        this.logger.info(`${styledLabel} ${name[0]!.toUpperCase()}${name.slice(1)}`);
      });
      if (result.diagnostics.length > 0) {
        this.logger.error('');
      }
      result.diagnostics.forEach((diagnostic) => {
        const location = diagnostic.path ? `${diagnostic.path}: ` : '';
        const owner = diagnostic.functionName ? `[${diagnostic.functionName}] ` : '';
        this.logger.error(
          colors.red(`${diagnostic.severity}: ${location}${owner}${diagnostic.message}`),
        );
      });
      if (result.status === 'passed') {
        this.logger.info('');
        this.logger.info(colors.green('Custom Function checks passed.'));
      } else {
        this.logger.error('');
        this.logger.error(colors.red('Custom Function checks failed.'));
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

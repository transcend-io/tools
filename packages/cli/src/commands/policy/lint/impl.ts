import path from 'node:path';

import { confirm } from '@inquirer/prompts';
import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { formatUnformattedPolicyFiles } from '../../../lib/promptMessages.js';
import { logger } from '../../../logger.js';
import { assertOpaInstalled, runOpa, runOPACapture } from '../helpers/index.js';

/** CLI flags for `transcend policy lint`. */
export interface LintCommandFlags {
  /** Directory containing Rego policy files */
  dir: string;
}

/**
 * Local Rego lint via `opa check` and optional interactive formatting via `opa fmt`.
 *
 * @param this - CLI context
 * @param flags - Command flags
 */
export async function lint(this: LocalContext, { dir }: LintCommandFlags): Promise<void> {
  doneInputValidation(this.process.exit);

  assertOpaInstalled();
  const resolvedDir = path.resolve(dir);

  logger.info(colors.green(`Linting policy bundle in ${resolvedDir}...`));

  const checkCode = await runOpa(['check', '--strict', resolvedDir]);
  if (checkCode !== 0) {
    this.process.exit(checkCode);
  }

  const { stdout } = await runOPACapture(['fmt', '--list', resolvedDir]);
  const unformattedFiles = stdout
    .trim()
    .split('\n')
    .filter((file) => file.length > 0);

  if (unformattedFiles.length > 0) {
    logger.error(colors.red('Policy files are not formatted:'));
    unformattedFiles.forEach((file) => {
      logger.error(colors.red(`  - ${file}`));
    });
    logger.error('');
    await runOpa(['fmt', '--diff', resolvedDir]);

    if (!this.process.stdin.isTTY) {
      logger.error(colors.red('Cannot format policy files in a non-interactive environment.'));
      this.process.exit(1);
    }

    const shouldFormat = await confirm({
      message: formatUnformattedPolicyFiles,
    });
    if (!shouldFormat) {
      this.process.exit(1);
    }

    const fmtWriteCode = await runOpa(['fmt', '-w', resolvedDir]);
    if (fmtWriteCode !== 0) {
      this.process.exit(fmtWriteCode);
    }

    logger.info(colors.green('Policy files formatted.'));
    logger.info(colors.green('Policy lint passed.'));
    return;
  }

  logger.info(colors.green('Policy lint passed.'));
}

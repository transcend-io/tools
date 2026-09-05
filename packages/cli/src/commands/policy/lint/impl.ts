import colors from 'colors';

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { inquirerConfirmBoolean } from '../../../lib/helpers/inquirer.js';
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
  doneInputValidation(this.process);

  assertOpaInstalled();
  const resolvedDir = this.path.resolve(dir);

  this.logger.info(colors.green(`Linting policy bundle in ${resolvedDir}...`));

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
    this.logger.error(colors.red('Policy files are not formatted:'));
    unformattedFiles.forEach((file) => {
      this.logger.error(colors.red(`  - ${file}`));
    });
    this.logger.error('');
    await runOpa(['fmt', '--diff', resolvedDir]);

    if (!this.process.stdin.isTTY) {
      this.logger.error(colors.red('Cannot format policy files in a non-interactive environment.'));
      this.process.exit(1);
    }

    const shouldFormat = await inquirerConfirmBoolean({
      message: 'Format the unformatted policy files listed above?',
    });
    if (!shouldFormat) {
      this.process.exit(1);
    }

    const fmtWriteCode = await runOpa(['fmt', '-w', resolvedDir]);
    if (fmtWriteCode !== 0) {
      this.process.exit(fmtWriteCode);
    }

    this.logger.info(colors.green('Policy files formatted.'));
    this.logger.info(colors.green('Policy lint passed.'));
    return;
  }

  this.logger.info(colors.green('Policy lint passed.'));
}

import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { PromptCancelledError } from '../shared/prompts.js';
import { runCustomFunctionInit, type CustomFunctionScaffoldFlags } from '../shared/scaffold.js';

/**
 * Initialize a credential-free local Custom Function project.
 *
 * @param this - CLI context
 * @param flags - Scaffold and interaction flags
 * @param directory - Optional target directory
 */
export async function init(
  this: LocalContext,
  flags: CustomFunctionScaffoldFlags,
  directory?: string,
): Promise<void> {
  doneInputValidation(this.process);
  try {
    await runCustomFunctionInit(this, flags, directory);
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}

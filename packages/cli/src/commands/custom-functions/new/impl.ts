import type { LocalContext } from '../../../context.js';
import { doneInputValidation } from '../../../lib/cli/done-input-validation.js';
import { PromptCancelledError } from '../shared/prompts.js';
import { runCustomFunctionNew, type CustomFunctionNewFlags } from '../shared/scaffold.js';

/**
 * Scaffold one deterministic local Custom Function.
 *
 * @param this - CLI context
 * @param flags - Template, setup, and interaction flags
 * @param directory - Optional target directory
 */
export async function newCustomFunction(
  this: LocalContext,
  flags: CustomFunctionNewFlags,
  directory?: string,
): Promise<void> {
  doneInputValidation(this.process);
  try {
    await runCustomFunctionNew(this, flags, directory);
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      this.process.exit(130);
    }
    throw error;
  }
}

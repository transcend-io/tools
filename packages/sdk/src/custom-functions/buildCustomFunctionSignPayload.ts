import type { CustomFunctionSignPayload } from './codeSigning.js';
import type { CustomFunctionConfigInput } from './syncCustomFunction.js';

/**
 * Build the sign payload for a custom function config.
 *
 * @param input - The custom function config
 * @returns The plaintext sign payload
 */
export function buildCustomFunctionSignPayload(
  input: CustomFunctionConfigInput,
): CustomFunctionSignPayload {
  return {
    code: input.code,
    context: {
      userDefinedEnv: input.env ?? {},
      allowedHosts: input.allowedHosts ?? [],
      ...(input.allowThirdPartyImports !== undefined
        ? { allowThirdPartyImports: input.allowThirdPartyImports }
        : {}),
      ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
    },
  };
}

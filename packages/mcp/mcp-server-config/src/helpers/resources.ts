import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';
import { TranscendPullResource } from '@transcend-io/sdk/transcend-yml';

const VALID_RESOURCES = new Set<string>(Object.values(TranscendPullResource));

/**
 * Validate section names from a tool call.
 *
 * Tool inputs take plain strings instead of an enum. The 30 names would otherwise
 * be repeated in the input schema of every tool, which counts against the size of
 * `tools/list`. The error names every valid value, so a wrong guess costs one retry.
 *
 * @param names - Section names from the arguments
 * @returns The names as resources
 * @throws ToolError naming the unknown sections and all valid ones
 */
export function parseResources(names: readonly string[]): TranscendPullResource[] {
  const unknown = names.filter((name) => !VALID_RESOURCES.has(name));
  if (unknown.length > 0) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `Unknown sections: ${unknown.join(', ')}. Valid sections: ${[...VALID_RESOURCES].join(', ')}.`,
      false,
    );
  }
  return names as TranscendPullResource[];
}

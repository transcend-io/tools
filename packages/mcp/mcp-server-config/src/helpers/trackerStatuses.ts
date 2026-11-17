import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';

const VALID_STATUSES = new Set<string>(Object.values(ConsentTrackerStatus));

/**
 * Validate tracker statuses from a tool call.
 *
 * @param names - Status names from the arguments
 * @returns The names as statuses
 * @throws ToolError naming the unknown statuses and all valid ones
 */
export function parseTrackerStatuses(names: readonly string[]): ConsentTrackerStatus[] {
  const unknown = names.filter((name) => !VALID_STATUSES.has(name));
  if (unknown.length > 0) {
    throw new ToolError(
      ErrorCode.VALIDATION_ERROR,
      `Unknown tracker statuses: ${unknown.join(', ')}. Valid: ${[...VALID_STATUSES].join(', ')}.`,
      false,
    );
  }
  return names as ConsentTrackerStatus[];
}

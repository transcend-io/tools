import { ErrorCode, ToolError } from '@transcend-io/mcp-server-base';

import type { CollectedLog } from './collectingLogger.js';

/**
 * Validate tool items against the same io-ts codec the transcend.yml file uses.
 *
 * Pass `(item) => decodeCodec(Codec, item, false)` as the decoder.
 *
 * @param decode - Decoder for one item, throws when the item is invalid
 * @param items - Raw items from the tool call
 * @param label - Noun used in error messages
 * @returns Decoded items
 * @throws ToolError naming the first item that fails
 */
export function decodeItems<T>(decode: (item: unknown) => T, items: unknown[], label: string): T[] {
  return items.map((item, index) => {
    try {
      return decode(item);
    } catch (error) {
      throw new ToolError(
        ErrorCode.VALIDATION_ERROR,
        `${label} item ${index} is invalid: ${
          error instanceof Error ? error.message : String(error)
        }. Use config_get_schema for the full format.`,
        false,
      );
    }
  });
}

/**
 * Split collected log lines into the error and warning messages a write returns.
 *
 * @param logs - Lines captured while the SDK ran
 * @returns Error and warning messages
 */
export function summarizeLogs(logs: CollectedLog[]): { errors: string[]; warnings: string[] } {
  return {
    errors: logs.filter((log) => log.level === 'error').map((log) => log.message),
    warnings: logs.filter((log) => log.level === 'warn').map((log) => log.message),
  };
}

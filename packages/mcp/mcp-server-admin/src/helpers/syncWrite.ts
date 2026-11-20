import { ErrorCode, ToolError, type CollectedLog } from '@transcend-io/mcp-server-base';
import { decodeCodec } from '@transcend-io/type-utils';

/** Compact result of a write tool. */
export interface WriteResult {
  /** Whether every item synced without error */
  success: boolean;
  /** Number of items sent */
  count: number;
  /** Error lines reported by the SDK */
  errors: string[];
  /** Warning lines reported by the SDK */
  warnings?: string[];
}

/**
 * Validate tool items against the codec the transcend.yml file uses.
 *
 * @param codec - io-ts codec for one item
 * @param items - Raw items from the tool call
 * @param label - Section name for error messages
 * @returns Decoded items
 * @throws ToolError when an item does not match the codec
 */
export function decodeItems<TItem>(
  codec: Parameters<typeof decodeCodec>[0],
  items: readonly unknown[],
  label: string,
): TItem[] {
  return items.map((item, index) => {
    try {
      return decodeCodec(codec, item, false) as TItem;
    } catch (error) {
      throw new ToolError(
        ErrorCode.VALIDATION_ERROR,
        `${label}[${index}] does not match the transcend.yml format: ${
          error instanceof Error ? error.message : String(error)
        }. Use config_get_schema for the full schema.`,
        false,
      );
    }
  });
}

/**
 * Run a sync that returns a boolean and report it as a compact result.
 *
 * @param run - Sync call that resolves true on success
 * @param logs - Lines captured while the sync ran
 * @param count - Number of items sent
 * @returns Success flag with error and warning lines
 */
export async function runSync(
  run: () => Promise<boolean>,
  logs: CollectedLog[],
  count: number,
): Promise<WriteResult> {
  let success: boolean;
  let thrown: string | undefined;
  try {
    success = await run();
  } catch (error) {
    success = false;
    thrown = error instanceof Error ? error.message : String(error);
  }
  const errors = [
    ...(thrown ? [thrown] : []),
    ...logs.filter((log) => log.level === 'error').map((log) => log.message),
  ];
  const warnings = logs.filter((log) => log.level === 'warn').map((log) => log.message);
  return {
    success,
    count,
    errors: success ? [] : errors.length > 0 ? errors : ['Sync failed'],
    ...(warnings.length > 0 && { warnings }),
  };
}

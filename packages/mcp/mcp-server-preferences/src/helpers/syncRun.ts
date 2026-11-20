import {
  CollectedLogLevel,
  createCollectedLogger,
  ErrorCode,
  ToolError,
  type Logger,
} from '@transcend-io/mcp-server-base';
import { decodeCodec } from '@transcend-io/type-utils';
/** An io-ts codec, as `decodeCodec` takes it. */
type Codec = Parameters<typeof decodeCodec>[0];

/** Result of a configuration write, shaped like the config push result. */
export interface WriteResult {
  /** True when the SDK sync finished without error */
  success: boolean;
  /** Error lines the SDK logged while syncing */
  errors: string[];
  /** Warning lines the SDK logged while syncing */
  warnings?: string[];
  /** Number of items sent */
  count: number;
}

/**
 * Check each item against the same io-ts codec the transcend.yml section uses.
 *
 * @typeParam TItem - Decoded item type
 * @param codec - Codec for one item of the section
 * @param items - Items from the tool call
 * @param section - Yaml key, used in the error message
 * @returns Decoded items
 * @throws ToolError when an item does not match the codec
 */
export function decodeItems<TItem>(codec: Codec, items: unknown[], section: string): TItem[] {
  return items.map((item, index) => {
    try {
      return decodeCodec(codec, item) as TItem;
    } catch (error) {
      throw new ToolError(
        ErrorCode.VALIDATION_ERROR,
        `${section}[${index}] is not valid: ${
          error instanceof Error ? error.message : String(error)
        }. Use config_get_schema for the section format.`,
        false,
      );
    }
  });
}

/**
 * Run an SDK sync function and turn its outcome into a compact result.
 *
 * @param count - Number of items being synced
 * @param run - Receives the collecting logger and returns the SDK success flag
 * @returns Success flag with the error and warning lines the SDK logged
 */
export async function runSync(
  count: number,
  run: (logger: Logger) => Promise<boolean>,
): Promise<WriteResult> {
  const { logger, logs } = createCollectedLogger();
  let success: boolean;
  const thrown: string[] = [];
  try {
    success = await run(logger);
  } catch (error) {
    success = false;
    thrown.push(error instanceof Error ? error.message : String(error));
  }
  const errors = [
    ...logs.filter((line) => line.level === CollectedLogLevel.Error).map((line) => line.message),
    ...thrown,
  ];
  const warnings = logs
    .filter((line) => line.level === CollectedLogLevel.Warn)
    .map((line) => line.message);
  return { success, errors, ...(warnings.length > 0 && { warnings }), count };
}

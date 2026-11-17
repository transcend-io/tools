import { ErrorCode, ToolError, type Logger } from '@transcend-io/mcp-server-base';
import { decodeCodec } from '@transcend-io/type-utils';
/** An io-ts codec, as `decodeCodec` takes it. */
type Codec = Parameters<typeof decodeCodec>[0];

/** Maximum lines kept, so a large sync cannot flood a tool result. */
const MAX_LOGS = 100;

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
 * Logger that keeps error and warning lines in memory instead of printing.
 *
 * A stdio MCP server reserves stdout for protocol frames, so SDK output must not
 * reach it.
 *
 * @returns The logger and the lines it captured
 */
export function createCollectedLogger(): {
  /** Logger to hand to SDK functions */
  logger: Logger;
  /** Captured error lines */
  errors: string[];
  /** Captured warning lines */
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const keep =
    (lines: string[]) =>
    (...args: unknown[]): void => {
      if (lines.length >= MAX_LOGS) return;
      lines.push(
        args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
      );
    };
  const ignore = (): void => {};
  return {
    logger: { debug: ignore, info: ignore, warn: keep(warnings), error: keep(errors) },
    errors,
    warnings,
  };
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
  const { logger, errors, warnings } = createCollectedLogger();
  let success: boolean;
  try {
    success = await run(logger);
  } catch (error) {
    success = false;
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return { success, errors, ...(warnings.length > 0 && { warnings }), count };
}

import { decodeCodec } from '@transcend-io/type-utils';

import { ErrorCode, ToolError } from '../errors.js';

/**
 * Decode each item with the codec the yml uses, so a tool accepts exactly what the file accepts.
 *
 * @param codec - io-ts codec for one item
 * @param items - Raw items from the tool call
 * @returns The decoded items
 * @throws ToolError naming the first invalid item
 */
export function decodeYmlItems<C extends Parameters<typeof decodeCodec>[0]>(
  codec: C,
  items: unknown[],
): ReturnType<typeof decodeCodec<C>>[] {
  return items.map((item, index) => {
    try {
      return decodeCodec(codec, item, false);
    } catch (error) {
      throw new ToolError(
        ErrorCode.VALIDATION_ERROR,
        `items[${index}] is not valid: ${error instanceof Error ? error.message : String(error)}`,
        false,
      );
    }
  });
}

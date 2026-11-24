import { McpToolErrorCode } from '@transcend-io/privacy-types';
import { decodeCodec } from '@transcend-io/type-utils';

import { ToolError } from '../errors.js';
import type { DecodeYmlItemsOptions } from './types.js';

/** An io-ts codec, as `decodeCodec` takes it. */
type Codec = Parameters<typeof decodeCodec>[0];

/**
 * Decode one record with the codec the yaml section uses.
 *
 * @param codec - io-ts codec for the section
 * @param record - Raw record from the tool call
 * @param section - Yaml key, used in error messages
 * @returns The decoded record
 * @throws ToolError when the record does not match the codec
 */
export function decodeYmlRecord<T>(codec: Codec, record: unknown, section: string): T {
  try {
    return decodeCodec(codec, record, false) as T;
  } catch (error) {
    throw new ToolError(
      McpToolErrorCode.ValidationError,
      `${section} does not match the transcend.yml format: ${
        error instanceof Error ? error.message : String(error)
      }. Use config_get_schema for the full schema.`,
      false,
    );
  }
}

/**
 * Decode each item with the codec the yaml section uses.
 *
 * @param codec - io-ts codec for one item
 * @param items - Raw items from the tool call
 * @param section - Yaml key, used in error messages
 * @param options - Optional uniqueness check
 * @returns The decoded items
 * @throws ToolError when an item does not match the codec or a duplicate key appears
 */
export function decodeYmlItems<T>(
  codec: Codec,
  items: readonly unknown[],
  section: string,
  options?: DecodeYmlItemsOptions<T>,
): T[] {
  const decoded = items.map((item, index) => {
    try {
      return decodeCodec(codec, item, false) as T;
    } catch (error) {
      throw new ToolError(
        McpToolErrorCode.ValidationError,
        `${section}[${index}] does not match the transcend.yml format: ${
          error instanceof Error ? error.message : String(error)
        }. Use config_get_schema for the full schema.`,
        false,
      );
    }
  });

  if (options?.uniqueBy) {
    const seen = new Set<string>();
    for (const item of decoded) {
      const key = options.uniqueBy(item);
      if (seen.has(key)) {
        throw new ToolError(
          McpToolErrorCode.ValidationError,
          `${section}: duplicate key "${key}" in this call`,
          false,
        );
      }
      seen.add(key);
    }
  }

  return decoded;
}

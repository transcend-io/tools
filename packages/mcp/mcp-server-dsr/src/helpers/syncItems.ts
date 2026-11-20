/** One failed item in a write tool call. */
export interface ItemError {
  /** Item label, such as the enricher title or action type */
  item: string;
  /** What went wrong */
  message: string;
}

/**
 * Read a message from an unknown thrown value.
 *
 * @param error - Thrown value
 * @returns Message text
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Validate raw tool items with a decoder built from the codec transcend.yml uses.
 *
 * @param decode - Decodes one raw item, throwing when it is invalid
 * @param items - Raw items from the tool call
 * @param label - Reads a display label from a raw item
 * @returns Decoded items and one error per item that failed validation
 */
export function decodeItems<T>(
  decode: (raw: unknown) => T,
  items: Record<string, unknown>[],
  label: (item: Record<string, unknown>, index: number) => string,
): {
  /** Items that matched the codec */
  valid: T[];
  /** Items that did not */
  errors: ItemError[];
} {
  const valid: T[] = [];
  const errors: ItemError[] = [];
  items.forEach((raw, index) => {
    try {
      valid.push(decode(raw));
    } catch (error) {
      errors.push({ item: label(raw, index), message: errorMessage(error).slice(0, 500) });
    }
  });
  return { valid, errors };
}

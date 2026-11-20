import { z } from '../validation/index.js';
import { MAX_SECTION_WRITE_ITEMS } from './constants.js';

/**
 * Zod schema for the array argument of a transcend.yml section write tool.
 * Real validation runs against the same io-ts codec the yaml uses.
 *
 * @param itemDescription - What one item looks like, in a sentence
 * @param max - Maximum items per call
 * @returns The zod array schema
 */
export function ymlItemsSchema(itemDescription: string, max = MAX_SECTION_WRITE_ITEMS) {
  return z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(max)
    .describe(
      `${itemDescription} Same shape as the transcend.yml section; see config_get_schema. ` +
        `Up to ${max} items.`,
    );
}

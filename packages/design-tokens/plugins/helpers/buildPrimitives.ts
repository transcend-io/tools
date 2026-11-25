import set from 'lodash/set';

import { valueToCss } from './valueToCss';

/** Categorized CSS values for a single primitive token group. */
export interface PrimitiveGroup {
  /** Named scales mapping a scale name to its step→CSS-value pairs (e.g. `{ gray: { '100': '…', '200': '…' } }`). */
  scales: Record<string, Record<string, string>>;
  /** Tokens that don't belong to a two-level scale, keyed directly by name. */
  standalone: Record<string, string>;
}

/**
 * Partition resolved DTCG tokens matching a prefix into two-level scales
 * and single-level standalone values.
 */
export function buildPrimitives(
  /** Flat map of dot-separated token IDs to resolved DTCG token objects. */
  tokens: Record<string, { $type: string; $value: unknown }>,
  /** Dot-terminated prefix that selects tokens for this group (e.g. `'palette.'`). */
  prefix: string,
): PrimitiveGroup {
  const result: PrimitiveGroup = { scales: {}, standalone: {} };
  for (const [id, token] of Object.entries(tokens)) {
    if (!id.startsWith(prefix)) {
      continue;
    }
    const parts = id.slice(prefix.length).split('.');
    const css = valueToCss(token.$value);
    if (parts.length === 2) {
      set(result.scales, [parts[0]!, parts[1]!], css);
    } else if (parts.length === 1) {
      result.standalone[parts[0]!] = css;
    } else {
      // Fail loudly rather than silently dropping tokens whose shape we don't
      // emit. If we ever need deeper nesting we should extend PrimitiveGroup.
      throw new Error(
        `Primitive token "${id}" has ${parts.length} segments after prefix "${prefix}"; ` +
          `only 1 (standalone) or 2 (scale.step) segments are supported.`,
      );
    }
  }
  return result;
}

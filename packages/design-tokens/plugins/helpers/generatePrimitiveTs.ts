import type { PrimitiveGroup } from './buildPrimitives';
import { HEADER } from './constants';
import { serializeObj } from './serializeObj';

/**
 * Generate a self-contained TypeScript source file that exports a
 * single `const` object containing every scale and standalone value
 * for one primitive token group.
 */
export function generatePrimitiveTs(
  /** Identifier used for the exported constant (e.g. `'palette'`). */
  name: string,
  /** Pre-built primitive group with scales and standalone entries. */
  group: PrimitiveGroup,
): string {
  // Sort for deterministic output independent of source JSON key order.
  const scaleNames = Object.keys(group.scales).sort();
  const standaloneEntries = Object.entries(group.standalone).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const lines = [HEADER];
  for (const scale of scaleNames) {
    lines.push(`const ${scale} = ${serializeObj(group.scales[scale]!)} as const;\n`);
  }
  const entries = [
    ...scaleNames.map((s) => `  ${s}: ${s},`),
    ...standaloneEntries.map(([k, v]) => `  ${k}: ${serializeObj(v)},`),
  ];
  lines.push(`export const ${name} = {\n${entries.join('\n')}\n} as const;\n`);
  return lines.join('\n');
}

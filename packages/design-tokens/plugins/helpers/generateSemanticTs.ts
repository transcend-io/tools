import upperFirst from 'lodash/upperFirst';

import { HEADER } from './constants';
import { serializeObj } from './serializeObj';

/** Find which of `candidateNames` actually appear as expressions in `bodies`. */
function collectReferencedPrimitives(
  bodies: string[],
  candidateNames: ReadonlySet<string>,
): string[] {
  const used = new Set<string>();
  for (const name of candidateNames) {
    // `\b` avoids matching a substring like `foopalette`.
    const pattern = new RegExp(`\\b${name}\\.`);
    if (bodies.some((body) => pattern.test(body))) {
      used.add(name);
    }
  }
  return [...used].sort();
}

/**
 * Generate a TypeScript source file that exports a multi-mode semantic
 * token object together with its `Mode` and `Semantic*` utility types.
 * Emits `import { <group> } from '../primitive'` for each primitive group
 * that the serialized modes actually reference.
 */
export function generateSemanticTs(
  /** Identifier used for the exported constant (e.g. `'color'`). */
  name: string,
  /** Map of mode names (e.g. `'light'`, `'dark'`) to their nested token objects. */
  modes: Record<string, Record<string, unknown>>,
  /** Primitive group names whose `TokenRef` expressions may appear in `modes`. */
  primitiveGroupNames: ReadonlySet<string> = new Set(),
): string {
  const modeNames = Object.keys(modes);
  const bodies = modeNames.map((mode) => serializeObj(modes[mode]!));

  const referenced = collectReferencedPrimitives(bodies, primitiveGroupNames);

  const lines = [HEADER];
  if (referenced.length > 0) {
    lines.push(`import { ${referenced.join(', ')} } from '../primitive/index.js';\n`);
  }
  modeNames.forEach((mode, i) => {
    lines.push(`const ${mode} = ${bodies[i]!} as const;\n`);
  });
  const modeEntries = modeNames.map((m) => `  ${m}: ${m},`).join('\n');
  lines.push(`export const ${name} = {\n${modeEntries}\n} as const;\n`);

  const typeName = upperFirst(name);
  lines.push(`export type ${typeName}Mode = keyof typeof ${name};\n`);
  lines.push(`export type Semantic${typeName}s = (typeof ${name})[${typeName}Mode];\n`);
  return lines.join('\n');
}

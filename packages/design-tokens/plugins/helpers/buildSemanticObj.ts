import set from 'lodash/set';

import type { AnnotatedValue, TokenRef } from './serializeObj';
import { valueToCss } from './valueToCss';

const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;

/**
 * A resolved DTCG token as exposed to the plugin; a subset of Terrazzo's
 * `TokenNormalized`. `aliasOf`, when set, is the final token ID in the
 * resolved alias chain (e.g. `'palette.gray.900'`).
 */
export interface ResolvedToken {
  $type: string;
  $value: unknown;
  $description?: string;
  aliasOf?: string;
}

/**
 * Convert a dotted token ID into a TS property-access expression matching
 * the generated primitive layout — e.g. `palette.gray.900` →
 * `palette.gray['900']`.
 */
function idToExpression(id: string): string {
  const [root, ...rest] = id.split('.');
  let expr = root!;
  for (const part of rest) {
    if (IDENTIFIER_RE.test(part)) {
      expr += `.${part}`;
    } else {
      expr += `['${part.replace(/'/g, "\\'")}']`;
    }
  }
  return expr;
}

/**
 * Build a nested object from resolved DTCG tokens for a single semantic file,
 * filtering to only the given top-level namespaces. Tokens that alias into
 * one of `referenceablePrefixes` are emitted as {@link TokenRef} nodes so
 * the serializer can render them as live TS expressions (preserving the
 * IntelliSense link back to the primitive); all others resolve to CSS.
 */
export function buildSemanticObj(
  /** Flat map of dot-separated token IDs to resolved DTCG token objects. */
  tokens: Record<string, ResolvedToken>,
  /** Namespace prefixes to include (e.g. `['background', 'text']`). */
  topLevelKeys: string[],
  /** Primitive-group names (e.g. `new Set(['palette'])`) eligible for ref emission. */
  referenceablePrefixes: ReadonlySet<string> = new Set(),
): Record<string, unknown> {
  const keySet = new Set(topLevelKeys);
  const obj: Record<string, unknown> = {};
  for (const [id, token] of Object.entries(tokens)) {
    const topKey = id.split('.')[0]!;
    if (!keySet.has(topKey)) {
      continue;
    }
    const aliasRoot = token.aliasOf?.split('.')[0];
    const leaf: string | TokenRef =
      token.aliasOf && aliasRoot && referenceablePrefixes.has(aliasRoot)
        ? { __ref: true, __expression: idToExpression(token.aliasOf) }
        : valueToCss(token.$value);
    const value: string | TokenRef | AnnotatedValue = token.$description
      ? { __annotated: true, __value: leaf, __description: token.$description }
      : leaf;
    set(obj, id.split('.'), value);
  }
  return obj;
}

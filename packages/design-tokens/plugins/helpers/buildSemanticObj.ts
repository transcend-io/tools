import set from 'lodash/set';

import type { AnnotatedValue, TokenRef } from './serializeObj';
import { isTypographyComposite, typographyToCssObj, valueToCss } from './valueToCss';

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
 * Resolve a token to a serializable leaf: palette `TokenRef`, CSS string, or
 * nested CSS property map for typography composites.
 */
function resolveLeaf(
  token: ResolvedToken,
  referenceablePrefixes: ReadonlySet<string>,
): string | TokenRef | Record<string, string> {
  const aliasRoot = token.aliasOf?.split('.')[0];
  if (token.aliasOf && aliasRoot && referenceablePrefixes.has(aliasRoot)) {
    return { __ref: true, __expression: idToExpression(token.aliasOf) };
  }
  if (isTypographyComposite(token.$value)) {
    return typographyToCssObj(token.$value);
  }
  return valueToCss(token.$value);
}

/**
 * Build a nested object from resolved DTCG tokens for a single semantic file,
 * filtering to only the given top-level namespaces. Tokens that alias into
 * one of `referenceablePrefixes` are emitted as {@link TokenRef} nodes so
 * the serializer can render them as live TS expressions (preserving the
 * IntelliSense link back to the primitive); all others resolve to CSS.
 *
 * Terrazzo flattens DTCG `$root` tokens onto the parent ID (e.g. the rest
 * value of `background.brand.bold` is ID `background.brand.bold`, with
 * states as `background.brand.bold.hovered`). When an ID is both a token and
 * a prefix of other tokens, the value is stored under a `$root` child so the
 * group can hold siblings and `toString()` can resolve to the rest value.
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
  const ids = Object.keys(tokens).filter((id) => keySet.has(id.split('.')[0]!));

  const obj: Record<string, unknown> = {};
  for (const id of ids) {
    const token = tokens[id]!;
    const leaf = resolveLeaf(token, referenceablePrefixes);
    const isGroupRoot = ids.some((other) => other.startsWith(`${id}.`));
    const path = isGroupRoot ? [...id.split('.'), '$root'] : id.split('.');

    if (typeof leaf === 'object' && leaf !== null && !('__ref' in leaf)) {
      // Typography composites can't carry AnnotatedValue wrappers; descriptions
      // on composites are dropped from the TS object (still in source JSON).
      set(obj, path, leaf);
      continue;
    }
    const value: string | TokenRef | AnnotatedValue = token.$description
      ? {
          __annotated: true,
          __value: leaf as string | TokenRef,
          __description: token.$description,
        }
      : (leaf as string | TokenRef);
    set(obj, path, value);
  }
  return obj;
}

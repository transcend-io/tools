/**
 * A token value paired with a description rendered as inline JSDoc in the
 * generated output. `__value` may be a CSS string literal or a {@link TokenRef}.
 */
export interface AnnotatedValue {
  __annotated: true;
  __value: string | TokenRef;
  __description: string;
}

/**
 * A reference to an already-generated token, emitted as a raw TS expression
 * (e.g. `palette.gray['900']`) rather than a string so IntelliSense follows
 * the link back to the primitive.
 */
export interface TokenRef {
  __ref: true;
  __expression: string;
}

function isAnnotated(v: unknown): v is AnnotatedValue {
  return typeof v === 'object' && v !== null && (v as AnnotatedValue).__annotated === true;
}

function isTokenRef(v: unknown): v is TokenRef {
  return typeof v === 'object' && v !== null && (v as TokenRef).__ref === true;
}

/**
 * A leaf is any value that resolves to a single CSS expression rather than
 * a nested group object (string literal, palette reference, or annotated value).
 */
function isLeaf(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) {
    return true;
  }
  if (isTokenRef(v)) {
    return true;
  }
  if (isAnnotated(v)) {
    return true;
  }
  return false;
}

/**
 * Produce a safely escaped single-quoted TypeScript string literal for `s`.
 * Uses `JSON.stringify` for correct handling of backslashes, newlines,
 * control characters, and unicode, then rewrites the surrounding double
 * quotes into single quotes (escaping any bare single quotes in the body).
 */
function tsStringLiteral(s: string): string {
  const json = JSON.stringify(s);
  const inner = json.slice(1, -1).replace(/'/g, "\\'");
  return `'${inner}'`;
}

/** JS identifier pattern used to decide whether a key needs quoting. */
const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;

/**
 * Return `key` as a valid TS object-literal key. Identifier-safe keys
 * are emitted bare; everything else (numbers, kebab-case, spaces, etc.)
 * is emitted as a properly-escaped string literal.
 */
function safeKey(key: string): string {
  if (IDENTIFIER_RE.test(key)) {
    return key;
  }
  return tsStringLiteral(key);
}

/**
 * Recursively serialize a nested object into a TypeScript object-literal string.
 * {@link AnnotatedValue} leaves produce an inline JSDoc comment before the key.
 * Object keys are sorted alphabetically so generated files are deterministic
 * regardless of the resolver's iteration order.
 */
export function serializeObj(
  /** Value to serialize (string, primitive, annotated value, or nested object). */
  obj: unknown,
  /** Current indentation depth (used for pretty-printing). */
  indent = 0,
): string {
  if (typeof obj === 'string') {
    return tsStringLiteral(obj);
  }
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }
  if (isTokenRef(obj)) {
    return obj.__expression;
  }
  if (isAnnotated(obj)) {
    return isTokenRef(obj.__value) ? obj.__value.__expression : tsStringLiteral(obj.__value);
  }
  const pad = '  '.repeat(indent + 1);
  const closePad = '  '.repeat(indent);
  // Sort keys for deterministic output. If every key is a non-negative integer
  // (e.g. palette scales `'50'`, `'100'`, `'500'`) sort numerically so that
  // `'50'` comes before `'100'`; otherwise fall back to lexical order.
  const rawEntries = Object.entries(obj as Record<string, unknown>);
  const allNumeric = rawEntries.every(([k]) => /^\d+$/.test(k));
  const entries = rawEntries.sort(([a], [b]) => {
    if (allNumeric) {
      return Number(a) - Number(b);
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const lines = entries.map(([key, val]) => {
    const jsdoc =
      isAnnotated(val) && val.__description ? `${pad}/** ${val.__description} */\n` : '';
    return `${jsdoc}${pad}${safeKey(key)}: ${serializeObj(val, indent + 1)},`;
  });

  // When a group has a leaf `default` child, add a toString() method so the
  // group auto-resolves in template-literal interpolations (e.g. styled-components).
  // This lets consumers write `theme.color.background.default` instead of the
  // awkward `theme.color.background.default.default`.
  const defaultEntry = entries.find(([key]) => key === 'default');
  if (defaultEntry && isLeaf(defaultEntry[1]) && entries.length > 1) {
    const defaultExpr = serializeObj(defaultEntry[1], indent + 1);
    lines.push(`${pad}toString() { return ${defaultExpr}; },`);
  }

  return `{\n${lines.join('\n')}\n${closePad}}`;
}

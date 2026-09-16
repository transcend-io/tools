/** Parsed static Rego reference. */
interface StaticRegoReference {
  /** Source representation of the reference. */
  source: string;
  /** Logical document path segments. */
  segments: string[];
  /** Offset immediately after the reference. */
  end: number;
}

/** Matches the beginning of a Rego package declaration. */
const PACKAGE_DECLARATION_PATTERN = /^\s*package\s+/mu;

/**
 * Read an identifier at a source offset.
 *
 * @param source - Rego source
 * @param start - Candidate identifier offset
 * @returns Identifier and following offset
 */
function readIdentifier(
  source: string,
  start: number,
): { identifier: string; end: number } | undefined {
  const match = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(source.slice(start));
  return match ? { identifier: match[0], end: start + match[0].length } : undefined;
}

/**
 * Advance past Rego whitespace.
 *
 * @param source - Rego source
 * @param start - Initial source offset
 * @returns First non-whitespace offset
 */
function skipWhitespace(source: string, start: number): number {
  let current = start;
  while (current < source.length && /\s/u.test(source[current]!)) {
    current += 1;
  }
  return current;
}

/**
 * Read a quoted or raw Rego string.
 *
 * @param source - Rego source
 * @param start - Opening quote offset
 * @returns Decoded string and following offset
 */
function readQuotedString(
  source: string,
  start: number,
): { value: string; end: number } | undefined {
  if (source[start] === '`') {
    const closingQuote = source.indexOf('`', start + 1);
    return closingQuote === -1
      ? undefined
      : { value: source.slice(start + 1, closingQuote), end: closingQuote + 1 };
  }
  if (source[start] !== '"') {
    return undefined;
  }
  let current = start + 1;
  while (current < source.length) {
    if (source[current] === '\\') {
      current += 2;
      continue;
    }
    if (source[current] === '"') {
      const raw = source.slice(start, current + 1);
      try {
        return { value: JSON.parse(raw) as string, end: current + 1 };
      } catch {
        return undefined;
      }
    }
    current += 1;
  }
  return undefined;
}

/**
 * Parse a static Rego reference with dotted or quoted bracket segments.
 *
 * @param source - Rego source
 * @param start - First identifier offset
 * @returns Parsed reference
 */
function parseStaticRegoReference(source: string, start: number): StaticRegoReference | undefined {
  const first = readIdentifier(source, start);
  if (!first) {
    return undefined;
  }
  const segments = [first.identifier];
  let current = first.end;
  while (current < source.length) {
    const separator = skipWhitespace(source, current);
    if (source[separator] === '.') {
      const identifierStart = skipWhitespace(source, separator + 1);
      const identifier = readIdentifier(source, identifierStart);
      if (!identifier) {
        break;
      }
      segments.push(identifier.identifier);
      current = identifier.end;
      continue;
    }
    if (source[separator] === '[') {
      const stringStart = skipWhitespace(source, separator + 1);
      const value = readQuotedString(source, stringStart);
      if (!value) {
        break;
      }
      const closingBracket = skipWhitespace(source, value.end);
      if (source[closingBracket] !== ']') {
        break;
      }
      segments.push(value.value);
      current = closingBracket + 1;
      continue;
    }
    break;
  }
  return {
    source: source.slice(start, current),
    segments,
    end: current,
  };
}

/**
 * Read the package reference declared by Rego source.
 *
 * @param contents - Rego source
 * @returns Package reference, or undefined when no declaration is present
 */
export function parseRegoPackageReference(
  contents: string,
): Omit<StaticRegoReference, 'end'> | undefined {
  const declaration = PACKAGE_DECLARATION_PATTERN.exec(contents);
  if (!declaration) {
    return undefined;
  }
  const reference = parseStaticRegoReference(contents, declaration.index + declaration[0].length);
  return reference ? { source: reference.source, segments: reference.segments } : undefined;
}

/**
 * Skip a string literal while scanning executable Rego source.
 *
 * @param source - Rego source
 * @param start - Opening delimiter offset
 * @returns Offset immediately after the string
 */
function skipStringLiteral(source: string, start: number): number {
  const delimiter = source[start]!;
  let current = start + 1;
  while (current < source.length) {
    if (delimiter === '"' && source[current] === '\\') {
      current += 2;
      continue;
    }
    if (source[current] === delimiter) {
      return current + 1;
    }
    current += 1;
  }
  return current;
}

/**
 * Find executable static `data` references outside imports.
 *
 * @param contents - Rego source
 * @returns References with one-based source lines
 */
export function findDirectDataReferences(
  contents: string,
): { reference: StaticRegoReference; line: number }[] {
  const references: { reference: StaticRegoReference; line: number }[] = [];
  let current = 0;
  while (current < contents.length) {
    if (contents[current] === '#') {
      const newline = contents.indexOf('\n', current);
      current = newline === -1 ? contents.length : newline + 1;
      continue;
    }
    if (contents[current] === '"' || contents[current] === '`') {
      current = skipStringLiteral(contents, current);
      continue;
    }
    const identifier = readIdentifier(contents, current);
    if (!identifier) {
      current += 1;
      continue;
    }
    if (identifier.identifier !== 'data') {
      current = identifier.end;
      continue;
    }
    const reference = parseStaticRegoReference(contents, current);
    if (!reference || reference.segments.length === 1) {
      current = identifier.end;
      continue;
    }
    const lineStart = contents.lastIndexOf('\n', current - 1) + 1;
    if (!/^\s*import\s+$/u.test(contents.slice(lineStart, current))) {
      references.push({
        reference,
        line: contents.slice(0, current).split('\n').length,
      });
    }
    current = reference.end;
  }
  return references;
}

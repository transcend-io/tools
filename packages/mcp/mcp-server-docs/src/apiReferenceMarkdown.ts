/** Public OpenAPI document for Transcend API reference pages. */
export const OAS_JSON_URL = 'https://docs.transcend.io/api/oas.json';

const API_REFERENCE_PATH_PREFIX = '/docs/api-reference/';
const FETCH_TIMEOUT_MS = 8_000;
const MAX_SCHEMA_DEPTH = 4;
const MAX_PROPERTY_LINES = 80;

/** Minimal OpenAPI 3.x shapes used for markdown rendering. */
interface OpenApiDocument {
  /** Path item map */
  paths?: Record<string, PathItem>;
  /** Webhook callbacks (same shape as path items) */
  webhooks?: Record<string, PathItem>;
  /** Shared components */
  components?: {
    /** Reusable schemas */
    schemas?: Record<string, SchemaObject>;
  };
}

interface PathItem {
  /** HTTP method → operation */
  get?: OperationObject;
  /** HTTP method → operation */
  post?: OperationObject;
  /** HTTP method → operation */
  put?: OperationObject;
  /** HTTP method → operation */
  patch?: OperationObject;
  /** HTTP method → operation */
  delete?: OperationObject;
  /** HTTP method → operation */
  head?: OperationObject;
  /** HTTP method → operation */
  options?: OperationObject;
}

interface OperationObject {
  /** Short title */
  summary?: string;
  /** Longer description */
  description?: string;
  /** Operation id */
  operationId?: string;
  /** Tags */
  tags?: string[];
  /** Path/query/header parameters (may be $ref) */
  parameters?: unknown[];
  /** Request body */
  requestBody?: {
    /** Content type → media */
    content?: Record<
      string,
      {
        /** Schema or $ref */
        schema?: SchemaObject;
      }
    >;
  };
  /** Status → response */
  responses?: Record<
    string,
    {
      /** Response description */
      description?: string;
    }
  >;
}

interface SchemaObject {
  /** JSON Schema type */
  type?: string | string[];
  /** Human description */
  description?: string;
  /** Object properties */
  properties?: Record<string, SchemaObject>;
  /** Required property names */
  required?: string[];
  /** Array item schema */
  items?: SchemaObject;
  /** Additional properties schema or boolean */
  additionalProperties?: SchemaObject | boolean;
  /** Enum values */
  enum?: unknown[];
  /** $ref to components */
  $ref?: string;
  /** oneOf variants */
  oneOf?: SchemaObject[];
  /** anyOf variants */
  anyOf?: SchemaObject[];
  /** allOf variants */
  allOf?: SchemaObject[];
}

let cachedOas: { document: OpenApiDocument; fetchedAt: number } | undefined;
const OAS_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Whether a docs URL is an API-reference page (HTML in the browser; OpenAPI here).
 *
 * @param url - Absolute docs.transcend.io URL
 * @returns True when the path is under /docs/api-reference/
 */
export function isApiReferenceUrl(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith(API_REFERENCE_PATH_PREFIX);
  } catch {
    return false;
  }
}

/**
 * Convert llms.txt path params `(id)` to OpenAPI `{id}`.
 *
 * @param path - Path from the docs URL after the HTTP method
 * @returns OpenAPI-style path
 */
export function docsPathToOpenApiPath(path: string): string {
  return path.replace(/\(([^/)]+)\)/g, '{$1}');
}

/**
 * Parse an API-reference docs URL into an OpenAPI lookup key.
 *
 * @param url - Absolute api-reference URL from docs_list
 * @returns Lookup target
 */
export function parseApiReferenceUrl(url: string): {
  /** webhook vs REST operation */
  kind: 'webhook' | 'operation';
  /** HTTP method for operations */
  method?: string;
  /** OpenAPI path or webhook key (leading slash) */
  key: string;
} {
  const pathname = new URL(url).pathname;
  if (!pathname.startsWith(API_REFERENCE_PATH_PREFIX)) {
    throw new Error(`Not an API-reference URL: ${url}`);
  }
  const rest = pathname.slice(API_REFERENCE_PATH_PREFIX.length);
  if (rest.startsWith('webhook/')) {
    return { kind: 'webhook', key: `/${rest}` };
  }
  const slash = rest.indexOf('/');
  if (slash <= 0) {
    throw new Error(`Unrecognized API-reference URL path: ${pathname}`);
  }
  const method = rest.slice(0, slash).toLowerCase();
  const path = docsPathToOpenApiPath(rest.slice(slash));
  return { kind: 'operation', method, key: path };
}

async function loadOpenApi(signal?: AbortSignal): Promise<OpenApiDocument> {
  const now = Date.now();
  if (cachedOas && now - cachedOas.fetchedAt < OAS_TTL_MS) {
    return cachedOas.document;
  }
  const response = await fetch(OAS_JSON_URL, {
    headers: { Accept: 'application/json' },
    signal: signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI document: HTTP ${response.status}`);
  }
  const document = (await response.json()) as OpenApiDocument;
  cachedOas = { document, fetchedAt: now };
  return document;
}

function resolveRef(document: OpenApiDocument, ref: string): SchemaObject | undefined {
  const match = /^#\/components\/schemas\/(.+)$/.exec(ref);
  if (!match?.[1]) {
    return undefined;
  }
  return document.components?.schemas?.[match[1]];
}

function schemaTypeLabel(schema: SchemaObject): string {
  if (schema.$ref) {
    return schema.$ref.split('/').pop() ?? schema.$ref;
  }
  if (schema.enum) {
    return `enum(${schema.enum.map(String).slice(0, 8).join('|')}${schema.enum.length > 8 ? '|…' : ''})`;
  }
  if (schema.type === 'array' && schema.items) {
    return `array<${schemaTypeLabel(schema.items)}>`;
  }
  if (Array.isArray(schema.type)) {
    return schema.type.join('|');
  }
  return schema.type ?? 'object';
}

function formatSchemaLines(
  document: OpenApiDocument,
  schema: SchemaObject | undefined,
  indent: string,
  depth: number,
  lines: string[],
): void {
  if (!schema || lines.length >= MAX_PROPERTY_LINES || depth > MAX_SCHEMA_DEPTH) {
    if (depth > MAX_SCHEMA_DEPTH && schema) {
      lines.push(`${indent}- …`);
    }
    return;
  }
  let resolved = schema;
  if (schema.$ref) {
    const target = resolveRef(document, schema.$ref);
    if (target) {
      resolved = { ...target, description: schema.description ?? target.description };
    } else {
      lines.push(`${indent}- \`${schemaTypeLabel(schema)}\``);
      return;
    }
  }
  if (resolved.allOf?.length) {
    for (const part of resolved.allOf) {
      formatSchemaLines(document, part, indent, depth, lines);
    }
    return;
  }
  if (resolved.oneOf?.length || resolved.anyOf?.length) {
    const variants = resolved.oneOf ?? resolved.anyOf ?? [];
    lines.push(`${indent}- one of:`);
    for (const variant of variants.slice(0, 5)) {
      formatSchemaLines(document, variant, `${indent}  `, depth + 1, lines);
    }
    return;
  }
  const properties = resolved.properties;
  if (properties) {
    const required = new Set(resolved.required ?? []);
    for (const [name, prop] of Object.entries(properties)) {
      if (lines.length >= MAX_PROPERTY_LINES) {
        lines.push(`${indent}- …`);
        return;
      }
      const req = required.has(name) ? ' required' : '';
      const desc = prop.description ? ` — ${prop.description.replace(/\s+/g, ' ').trim()}` : '';
      lines.push(`${indent}- \`${name}\` (${schemaTypeLabel(prop)}${req})${desc}`);
      if (prop.properties || prop.$ref || prop.items?.properties || prop.allOf) {
        formatSchemaLines(document, prop, `${indent}  `, depth + 1, lines);
      } else if (prop.items && (prop.items.properties || prop.items.$ref)) {
        formatSchemaLines(document, prop.items, `${indent}  `, depth + 1, lines);
      }
    }
    return;
  }
  if (resolved.type === 'array' && resolved.items) {
    lines.push(`${indent}- items (${schemaTypeLabel(resolved.items)})`);
    formatSchemaLines(document, resolved.items, `${indent}  `, depth + 1, lines);
  }
}

function renderOperationMarkdown(
  document: OpenApiDocument,
  titlePath: string,
  method: string,
  operation: OperationObject,
  sourceUrl: string,
): string {
  const lines: string[] = [];
  const heading = operation.summary ?? operation.operationId ?? titlePath;
  lines.push(`# ${heading}`);
  lines.push('');
  lines.push(`\`${method.toUpperCase()} ${titlePath}\``);
  lines.push('');
  if (operation.description?.trim()) {
    lines.push(operation.description.trim());
    lines.push('');
  }
  if (operation.tags?.length) {
    lines.push(`Tags: ${operation.tags.join(', ')}`);
    lines.push('');
  }

  const jsonSchema = operation.requestBody?.content?.['application/json']?.schema;
  if (jsonSchema) {
    lines.push('## Request body (`application/json`)');
    lines.push('');
    const schemaLines: string[] = [];
    formatSchemaLines(document, jsonSchema, '', 0, schemaLines);
    if (schemaLines.length === 0) {
      lines.push(`Type: \`${schemaTypeLabel(jsonSchema)}\``);
    } else {
      lines.push(...schemaLines);
    }
    lines.push('');
  }

  const responses = operation.responses;
  if (responses && Object.keys(responses).length > 0) {
    lines.push('## Responses');
    lines.push('');
    for (const [status, response] of Object.entries(responses)) {
      const desc = response.description?.replace(/\s+/g, ' ').trim() ?? '';
      lines.push(`- **${status}**: ${desc || '(no description)'}`);
    }
    lines.push('');
  }

  lines.push(`Source: ${sourceUrl}`);
  return lines.join('\n');
}

/**
 * Render markdown for an API-reference docs URL from the published OpenAPI doc.
 *
 * @param url - Absolute api-reference URL
 * @param signal - Optional abort signal
 * @returns Compact markdown for the operation or webhook
 */
export async function renderApiReferenceMarkdown(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const target = parseApiReferenceUrl(url);
  const document = await loadOpenApi(signal);

  if (target.kind === 'webhook') {
    const item = document.webhooks?.[target.key];
    const operation =
      item?.post ?? item?.get ?? item?.put ?? item?.patch ?? item?.delete ?? undefined;
    if (!operation) {
      throw new Error(`No OpenAPI webhook found for ${target.key}. Check the URL from docs_list.`);
    }
    return renderOperationMarkdown(document, target.key, 'POST', operation, url);
  }

  const method = target.method!;
  const item = document.paths?.[target.key];
  const operation = item?.[method as keyof PathItem] as OperationObject | undefined;
  if (!operation) {
    throw new Error(
      `No OpenAPI operation ${method.toUpperCase()} ${target.key} found. Check the URL from docs_list.`,
    );
  }
  return renderOperationMarkdown(document, target.key, method, operation, url);
}

/** Clears the cached OpenAPI document (for tests). */
export function resetOpenApiCacheForTests(): void {
  cachedOas = undefined;
}

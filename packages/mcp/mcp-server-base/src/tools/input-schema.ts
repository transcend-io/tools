import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';

import type { ToolDefinition } from './types.js';

/**
 * A tool's zod schema as the JSON Schema that goes on the wire in `tools/list`.
 *
 * `toJsonSchemaCompat` stamps every schema with a `$schema` dialect pointer.
 * MCP already fixes the dialect for `inputSchema`, so the pointer tells clients
 * nothing they do not know, and at ~50 characters per tool it is one of the
 * largest single line items in the payload. Dropping it is invisible to clients
 * and buys back roughly 4 KB across the umbrella server.
 */
export function toolInputSchema(zodSchema: ToolDefinition['zodSchema']): Record<string, unknown> {
  const { $schema: _dialect, ...schema } = toJsonSchemaCompat(zodSchema as never) as Record<
    string,
    unknown
  >;
  return schema;
}

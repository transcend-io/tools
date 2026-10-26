import { z } from 'zod';

import type { ToolDefinition } from './types.js';

/**
 * JSON Schema for `tools/list`, converted with this package's zod so we never
 * hand a foreign zod object to the MCP SDK's converter.
 */
export function toolInputSchema(zodSchema: ToolDefinition['zodSchema']): Record<string, unknown> {
  const { $schema: _dialect, ...schema } = z.toJSONSchema(zodSchema, {
    io: 'input',
  });
  return schema;
}

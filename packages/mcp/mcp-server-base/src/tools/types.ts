import { type z } from 'zod';

import type { TranscendGraphQLBase } from '../clients/graphql/base.js';
import type { TranscendRestClient } from '../clients/rest-client.js';

export interface ToolAnnotations {
  /** Whether this tool only reads data */
  readOnlyHint: boolean;
  /** Whether this tool can cause irreversible changes */
  destructiveHint: boolean;
  /** Whether repeated calls with same args produce same result */
  idempotentHint: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ToolDefinition {
  /** Unique tool name */
  name: string;
  /** Human-readable description for LLM */
  description: string;
  /** Grouping category */
  category: string;
  /** Whether this tool only reads data */
  readOnly: boolean;
  /** Message shown to user before execution */
  confirmationHint?: string;
  /** MCP tool annotations */
  annotations: ToolAnnotations;
  /** Zod schema for input validation and JSON Schema derivation */
  zodSchema: z.ZodType<any>;
  /**
   * Zod schema for handler return value. Used to populate `outputSchema` in
   * `tools/list` and `structuredContent` in `CallToolResult`. Validation is
   * non-throwing — failures are logged to stderr and the raw handler return
   * is still surfaced as `structuredContent`.
   */
  outputZodSchema: z.ZodType<any>;
  /** Handler receives pre-validated args */
  handler: (args: any) => Promise<unknown>;
}

export interface ToolClients {
  /** REST API client */
  rest: TranscendRestClient;
  /** GraphQL API client */
  graphql: TranscendGraphQLBase;
}

/**
 * Type-safe tool factory. Infers handler arg types from the zodSchema and
 * handler return types from the outputZodSchema so you never need manual
 * `as z.infer<typeof …>` casts.
 */
export function defineTool<TIn, TOut>(config: {
  /** Unique tool name */
  name: string;
  /** Human-readable description for LLM */
  description: string;
  /** Grouping category */
  category: string;
  /** Whether this tool only reads data */
  readOnly: boolean;
  /** Message shown to user before execution */
  confirmationHint?: string;
  /** MCP tool annotations */
  annotations: ToolAnnotations;
  /** Zod schema for input validation and JSON Schema derivation */
  zodSchema: z.ZodType<TIn>;
  /** Zod schema for handler return value */
  outputZodSchema: z.ZodType<TOut>;
  /** Handler receives pre-validated, fully typed args */
  handler: (args: TIn) => Promise<TOut>;
}): ToolDefinition {
  return config;
}

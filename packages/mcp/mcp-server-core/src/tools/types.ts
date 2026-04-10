import { type z } from 'zod';

import type { TranscendGraphQLBase } from '../clients/graphql/base.js';

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
  /** Handler receives pre-validated args */
  handler: (args: any) => Promise<unknown>;
}

export interface ToolClients {
  /** GraphQL API client */
  graphql: TranscendGraphQLBase;
}

/**
 * Type-safe tool factory. Infers handler arg types from the zodSchema
 * so you never need manual `as z.infer<typeof …>` casts.
 */
export function defineTool<T>(config: {
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
  zodSchema: z.ZodType<T>;
  /** Handler receives pre-validated, fully typed args */
  handler: (args: T) => Promise<unknown>;
}): ToolDefinition {
  return config;
}

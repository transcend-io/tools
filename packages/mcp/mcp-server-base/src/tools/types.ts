import { type z } from 'zod';

import type { TranscendGraphQLBase } from '../clients/graphql/base.js';
import type { TranscendRestClient } from '../clients/rest-client.js';

/** MCP App UI resource served via `resources/read` */
export interface McpAppResource {
  /** `ui://` resource URI */
  uri: string;
  /** Human-readable resource name */
  name: string;
  /** Optional description for `resources/list` */
  description?: string;
  /** Loads bundled HTML for the MCP App */
  loadHtml: () => Promise<string>;
}

export interface ToolUiMeta {
  /** URI of the MCP App resource to render for this tool */
  resourceUri: string;
}

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
  /** When set, hosts render the linked MCP App alongside this tool */
  ui?: ToolUiMeta;
  /** When true, listed with `_meta.ui.visibility: ["app"]` for MCP App use only */
  internal?: boolean;
}

export interface ToolClients {
  /** REST API client */
  rest: TranscendRestClient;
  /** GraphQL API client */
  graphql: TranscendGraphQLBase;
  /**
   * Base URL for the Transcend admin dashboard. In production this is always
   * `https://app.transcend.io` (the dashboard is single-region; the regional
   * split lives on the API host instead) — see `DEFAULT_DASHBOARD_URL`. Kept
   * configurable on the client surface so tests can inject a fake host.
   */
  dashboardUrl: string;
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
  /** When set, hosts render the linked MCP App alongside this tool */
  ui?: ToolUiMeta;
  /** When true, listed with `_meta.ui.visibility: ["app"]` for MCP App use only */
  internal?: boolean;
}): ToolDefinition {
  return config;
}

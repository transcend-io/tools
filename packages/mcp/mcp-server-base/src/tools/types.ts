import { type z } from 'zod';

import type { TranscendGraphQLBase } from '../clients/graphql/base.js';
import type { TranscendRestClient } from '../clients/rest-client.js';
import { collectMissingDescriptions } from '../validation/describe-audit.js';

export interface ToolAnnotations {
  /** Whether this tool only reads data */
  readOnlyHint: boolean;
  /** Whether this tool can cause irreversible changes */
  destructiveHint: boolean;
  /** Whether repeated calls with same args produce same result */
  idempotentHint: boolean;
}

/**
 * MCP Apps UI metadata attached to a tool (`_meta.ui`).
 *
 * @see https://modelcontextprotocol.io/extensions/apps
 */
export interface ToolUiMeta {
  /** URI of the UI resource to render (typically `ui://…`) */
  resourceUri: string;
  /**
   * Who may see/call this tool. Omit for default (model + app).
   * Use `["app"]` for app-only helpers hidden from the model.
   */
  visibility?: Array<'model' | 'app'>;
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
  /**
   * When false, this tool runs without lazy OAuth or request auth injection at call time.
   * Server startup auth is controlled separately via {@link MCPServerOptions.requireStartupAuth}.
   * Use for tools that only access public resources. Default true.
   */
  requireAuth?: boolean;
  /**
   * Optional MCP `_meta` for this tool (included in `tools/list` and `tools/call`).
   * For MCP Apps, set `_meta.ui.resourceUri` to the matching UI resource URI.
   */
  _meta?: {
    /** MCP Apps UI metadata */
    ui?: ToolUiMeta;
    [key: string]: unknown;
  };
}

/**
 * An MCP resource served by {@link buildMcpServer} (e.g. an MCP App HTML view).
 */
export interface ResourceDefinition {
  /** Resource URI (e.g. `ui://assessments/hello-world.html`) */
  uri: string;
  /** Human-readable resource name */
  name: string;
  /** Optional description for `resources/list` */
  description?: string;
  /** MIME type (use `text/html;profile=mcp-app` for MCP Apps) */
  mimeType: string;
  /** Read callback returning the resource body */
  read: () => Promise<{
    /** Resource text body */
    text: string;
    /** Optional per-content `_meta` (CSP, domain, etc.) */
    _meta?: Record<string, unknown>;
  }>;
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
  /**
   * When false, this tool runs without lazy OAuth or request auth injection at call time.
   * Server startup auth is controlled separately via {@link MCPServerOptions.requireStartupAuth}.
   * Use for tools that only access public resources. Default true.
   */
  requireAuth?: boolean;
  /**
   * Optional MCP `_meta` for this tool (included in `tools/list` and `tools/call`).
   * For MCP Apps, set `_meta.ui.resourceUri` to the matching UI resource URI.
   */
  _meta?: {
    /** MCP Apps UI metadata */
    ui?: ToolUiMeta;
    [key: string]: unknown;
  };
}): ToolDefinition {
  // Descriptions are the only signal an LLM caller has for what each argument
  // means, so refuse to construct a tool whose input schema has any field
  // (at any nesting depth) without a meaningful description. Failing loudly at
  // construction surfaces the gap during local dev / tests / server startup
  // instead of silently degrading tool quality in production.
  const missing = collectMissingDescriptions(config.zodSchema);
  if (missing.length > 0) {
    throw new Error(
      `Tool "${config.name}" has input fields missing a meaningful Zod ` +
        `.describe(): ${missing.join(', ')}. Add a description explaining ` +
        'what each field is and what valid values look like.',
    );
  }
  return config;
}

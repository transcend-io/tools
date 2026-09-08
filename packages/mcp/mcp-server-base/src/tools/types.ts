import { z } from 'zod';

import type { TranscendGraphQLBase } from '../clients/graphql/base.js';
import type { TranscendRestClient } from '../clients/rest-client.js';
import { collectMissingDescriptions } from '../validation/describe-audit.js';
import type { UiResourceDefinition } from './ui-resource.js';

export interface ToolAnnotations {
  /** Whether this tool only reads data */
  readOnlyHint: boolean;
  /** Whether this tool can cause irreversible changes */
  destructiveHint: boolean;
  /** Whether repeated calls with same args produce same result */
  idempotentHint: boolean;
}

/**
 * Who may call a tool, per the MCP Apps spec.
 *
 * - `model`: the agent sees the tool in `tools/list` and may call it
 * - `app`: an MCP App view served by this server may call it
 */
export type ToolVisibility = 'model' | 'app';

/** Default when a tool does not declare visibility: reachable by both. */
export const DEFAULT_TOOL_VISIBILITY: readonly ToolVisibility[] = ['model', 'app'];

/** Binds a tool's results to an MCP App view that renders them. */
export interface ToolUiBinding {
  /** UI resource the host should render for this tool's results */
  resource: UiResourceDefinition;
}

/**
 * Human confirmation gate. Presence opts the tool in; `hint` is the prose shown
 * to the user before approving.
 */
export interface ToolConfirmation {
  /** What the action does and what it costs to get wrong. */
  hint: string;
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
  /** When set, requires human approval before the handler runs. */
  confirmation?: ToolConfirmation;
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
   * When true, this tool calls the Sombra REST customer ingress.
   * Agentic Assist (Prometheus) omits tools where `requireSombra === true`.
   * Leave undefined for GraphQL-only / non-Sombra tools.
   */
  requireSombra?: boolean;
  /**
   * MCP App view that renders this tool's results. Hosts without MCP Apps
   * support ignore the metadata and show the text result instead.
   */
  ui?: ToolUiBinding;
  /**
   * Who may call this tool. Defaults to {@link DEFAULT_TOOL_VISIBILITY}. Omit
   * `model` for tools that exist only so an MCP App view can call them.
   */
  visibility?: readonly ToolVisibility[];
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
  /** When set, requires human approval before the handler runs. */
  confirmation?: ToolConfirmation;
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
   * When true, this tool calls the Sombra REST customer ingress.
   * Agentic Assist (Prometheus) omits tools where `requireSombra === true`.
   * Leave undefined for GraphQL-only / non-Sombra tools.
   */
  requireSombra?: boolean;
  /**
   * MCP App view that renders this tool's results. Hosts without MCP Apps
   * support ignore the metadata and show the text result instead.
   */
  ui?: ToolUiBinding;
  /**
   * Who may call this tool. Defaults to {@link DEFAULT_TOOL_VISIBILITY}. Omit
   * `model` for tools that exist only so an MCP App view can call them.
   */
  visibility?: readonly ToolVisibility[];
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
  if (config.confirmation) {
    assertConfirmableSchema(config.name, config.zodSchema);
    assertConfirmableAnnotations(config.name, config.annotations);
    if (config.confirmation.hint.trim() === '') {
      throw new Error(
        `Tool "${config.name}" requires confirmation but its hint is empty. That hint is the ` +
          'only prose the user reads before approving.',
      );
    }
    if (config.ui) {
      throw new Error(confirmationViewError(config.name, 'an MCP App view'));
    }
  }
  return config;
}

/** Gated tools must use a z.object schema so `approvalToken` can be added. */
export function assertConfirmableSchema(
  toolName: string,
  schema: z.ZodType<unknown>,
): asserts schema is z.ZodObject<z.ZodRawShape> {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error(
      `Tool "${toolName}" requires confirmation but its zodSchema is not a z.object(). ` +
        'The confirmation gate adds an optional approvalToken field, which needs an ' +
        'object schema to extend.',
    );
  }
}

/** Gated tools must be annotated as mutating. destructiveHint is independent — it tells hosts how loudly to warn, not whether the server gate runs. */
export function assertConfirmableAnnotations(toolName: string, annotations: ToolAnnotations): void {
  if (annotations.readOnlyHint) {
    throw new Error(
      `Tool "${toolName}" declares confirmation but annotates readOnlyHint: true. ` +
        'Confirmation gates a mutation, and a read-only tool has nothing to approve.',
    );
  }
}

/**
 * Confirmation and MCP App views conflict: the gate runs before the handler,
 * but a view only renders after it returns.
 */
export function confirmationViewError(toolName: string, attachedVia: string): string {
  return (
    `Tool "${toolName}" declares confirmation and ${attachedVia}. The confirmation gate ` +
    'is server-enforced and runs before the handler, but an MCP App view only renders ' +
    'once the handler has returned — so on an MCP Apps host the gate cannot be what asks ' +
    'the user. Either drop the view, or drop confirmation and build approval into the ' +
    'view: have the handler return the pending action without performing it, and put the ' +
    'mutation in an appOnlyTool the view calls once the user clicks.'
  );
}

/**
 * Whether the agent should see this tool in `tools/list`. App-only tools stay
 * callable via `tools/call` so an MCP App view can still reach them.
 */
export function isVisibleToModel(
  /** Tool to test */
  tool: ToolDefinition,
): boolean {
  return (tool.visibility ?? DEFAULT_TOOL_VISIBILITY).includes('model');
}

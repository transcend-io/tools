import {
  PrimitiveSchemaDefinitionSchema,
  type ElicitRequestFormParams,
} from '@modelcontextprotocol/sdk/types.js';
import { type z } from 'zod';

import { McpClientCapability, type ClientCapabilityReport } from '../capabilities/types.js';
import { collectMissingDescriptions } from '../validation/describe-audit.js';
import { withConfirmation, type ConfirmationGate } from './confirmation/index.js';
import {
  confirmationViewError,
  defineTool,
  type ToolAnnotations,
  type ToolConfirmation,
  type ToolDefinition,
} from './types.js';
import type { UiResourceDefinition } from './ui-resource.js';

/**
 * Flat, primitives-only schema the host renders as a form.
 *
 * The MCP spec restricts `elicitation/create` to a single-level object of
 * primitives, so this is deliberately not a Zod schema: it cannot express what
 * a tool's `zodSchema` can, and conflating the two invites authoring a nested
 * schema that the host silently refuses.
 */
export type ElicitFormSchema = ElicitRequestFormParams['requestedSchema'];

/** Alternate behavior for hosts that can render server-requested forms. */
export interface ElicitationVariant<T> {
  /** Fields to collect before running, as a flat primitives-only schema */
  elicitSchema: ElicitFormSchema;
  /** Prompt shown above the form explaining what is being asked and why */
  elicitMessage: string;
  /** Runs after the form is submitted, or when the user declines */
  handler: (args: T) => Promise<unknown>;
}

/** Alternate behavior for hosts that can render MCP App views. */
export interface McpAppVariant<T> {
  /** View the host renders for this tool's results */
  resource: UiResourceDefinition;
  /** Produces the payload the view consumes; must stay useful as plain text */
  handler: (args: T) => Promise<unknown>;
  /**
   * Extra tools that exist only so the view can call them, for example a
   * refresh action. Forced to `visibility: ['app']` so the agent never sees
   * them.
   */
  appOnlyTools?: ToolDefinition[];
}

/** Per-capability alternatives for a tool. Every entry is optional. */
export interface ToolVariants<T> {
  /** Used when the host supports `elicitation/create` in form mode */
  [McpClientCapability.Elicitation]?: ElicitationVariant<T>;
  /** Used when the host supports MCP Apps */
  [McpClientCapability.McpApp]?: McpAppVariant<T>;
}

/**
 * Variant map with its argument type erased, mirroring how {@link ToolDefinition}
 * erases `zodSchema` and `handler`. Dispatch happens after Zod has validated the
 * input, so the precise type has already done its job by then.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErasedToolVariants = ToolVariants<any>;

/**
 * A tool that can present itself differently depending on host capabilities.
 *
 * Extends {@link ToolDefinition} so that every existing code path — schema
 * caching, the description audit, the unified server's registry — keeps working
 * on it untouched. The inherited `handler` is the baseline that runs on hosts
 * with no relevant capabilities.
 */
export interface CapabilityAwareToolDefinition extends ToolDefinition {
  /** Alternate implementations keyed by the capability that unlocks them */
  variants: ErasedToolVariants;
}

/** Whether a tool carries capability variants. */
export function isCapabilityAwareTool(
  /** Tool to test */
  tool: ToolDefinition,
): tool is CapabilityAwareToolDefinition {
  return 'variants' in tool;
}

/**
 * Validates an elicitation schema against the spec's primitives-only subset.
 *
 * Nesting is the mistake authors actually make here, and a host's response is
 * to reject the request at call time — long after the tool looked fine. Failing
 * at construction keeps that in dev and CI.
 */
export function assertElicitFormSchema(
  /** Tool being defined, used in the error message */
  toolName: string,
  /** Schema to validate */
  schema: ElicitFormSchema,
): void {
  if (schema.type !== 'object') {
    throw new Error(
      `Tool "${toolName}" has an elicitation schema of type "${schema.type}". ` +
        'Elicitation requires a top-level object.',
    );
  }

  const properties = Object.entries(schema.properties ?? {});
  if (properties.length === 0) {
    throw new Error(
      `Tool "${toolName}" has an elicitation schema with no properties. Give it at ` +
        'least one field, or drop the elicitation variant.',
    );
  }

  for (const [field, definition] of properties) {
    const parsed = PrimitiveSchemaDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      throw new Error(
        `Tool "${toolName}" has elicitation field "${field}" that is not a supported ` +
          'primitive. Elicitation allows only a flat object of string, number, integer, ' +
          'boolean, and enum fields — no nested objects or arrays of objects.',
      );
    }
    const description = (definition as { description?: unknown }).description;
    if (typeof description !== 'string' || description.trim() === '') {
      throw new Error(
        `Tool "${toolName}" has elicitation field "${field}" with no description. The ` +
          'description is the label the user reads in the form, so it cannot be blank.',
      );
    }
  }

  for (const required of schema.required ?? []) {
    if (!(required in (schema.properties ?? {}))) {
      throw new Error(
        `Tool "${toolName}" marks elicitation field "${required}" as required but never ` +
          'defines it.',
      );
    }
  }
}

/**
 * Type-safe factory for a tool with capability-specific implementations.
 *
 * Enforces the same description contract as {@link defineTool} on the baseline
 * input schema, and additionally validates each variant so a malformed
 * elicitation schema or UI binding fails here rather than mid-conversation.
 */
export function defineToolWithCapabilities<T>(config: {
  /** Unique tool name */
  name: string;
  /** Human-readable description for LLM */
  description: string;
  /** Grouping category */
  category: string;
  /** Whether this tool only reads data */
  readOnly: boolean;
  /** When set, requires human approval on every resolved variant. */
  confirmation?: ToolConfirmation;
  /** MCP tool annotations */
  annotations: ToolAnnotations;
  /** Zod schema for input validation and JSON Schema derivation */
  zodSchema: z.ZodType<T>;
  /** Baseline handler for hosts with no relevant capabilities */
  handler: (args: T) => Promise<unknown>;
  /**
   * When false, this tool runs without lazy OAuth or request auth injection at call time.
   * Use for tools that only access public resources. Default true.
   */
  requireAuth?: boolean;
  /** Alternate implementations keyed by the capability that unlocks them */
  variants: ToolVariants<T>;
}): CapabilityAwareToolDefinition {
  const { variants, ...base } = config;

  // Reuse defineTool so the description audit and its error message stay in one
  // place rather than drifting between the two factories.
  const baseline = defineTool(base);

  const elicitation = variants[McpClientCapability.Elicitation];
  if (elicitation) {
    assertElicitFormSchema(config.name, elicitation.elicitSchema);
    if (elicitation.elicitMessage.trim() === '') {
      throw new Error(
        `Tool "${config.name}" has an elicitation variant with an empty message. The ` +
          'message is what tells the user why they are being asked.',
      );
    }
  }

  const mcpApp = variants[McpClientCapability.McpApp];
  if (mcpApp) {
    if (config.confirmation) {
      throw new Error(confirmationViewError(config.name, 'an MCP App variant'));
    }
    for (const appOnlyTool of mcpApp.appOnlyTools ?? []) {
      const missing = collectMissingDescriptions(appOnlyTool.zodSchema);
      if (missing.length > 0) {
        throw new Error(
          `Tool "${config.name}" has app-only tool "${appOnlyTool.name}" with input ` +
            `fields missing a meaningful Zod .describe(): ${missing.join(', ')}.`,
        );
      }
    }
  }

  return { ...baseline, variants: variants as ErasedToolVariants };
}

/**
 * Picks the implementation to use for a host.
 *
 * Precedence is fixed at MCP App, then elicitation, then baseline, so
 * `tools/list` and `tools/call` always agree for a given client. Returns a plain
 * {@link ToolDefinition} that the rest of the server treats like any other.
 */
export function resolveToolVariant(
  /** Tool to resolve */
  tool: ToolDefinition,
  /** Capabilities of the connected host */
  client: ClientCapabilityReport,
): ToolDefinition {
  if (!isCapabilityAwareTool(tool)) return tool;

  const { variants, ...baseline } = tool;

  const mcpApp = variants[McpClientCapability.McpApp];
  if (mcpApp && client.capabilities.has(McpClientCapability.McpApp)) {
    return { ...baseline, handler: mcpApp.handler, ui: { resource: mcpApp.resource } };
  }

  const elicitation = variants[McpClientCapability.Elicitation];
  if (elicitation && client.capabilities.has(McpClientCapability.Elicitation)) {
    return { ...baseline, handler: elicitation.handler };
  }

  return baseline;
}

/**
 * Expands a tool list into the concrete set for a host: one resolved variant per
 * tool, plus any app-only companions that the winning MCP App variant needs.
 *
 * Companions are forced to `visibility: ['app']` here rather than trusting the
 * author to set it, because a leaked companion tool shows the agent an
 * implementation detail it cannot use sensibly.
 */
export function expandToolsForClient(
  /** Tools registered with the server */
  tools: readonly ToolDefinition[],
  /** Capabilities of the connected host */
  client: ClientCapabilityReport,
  /**
   * How this connection may obtain approval for gated tools. Required, and
   * deliberately not defaulted: a default would mean every new serving path
   * silently picked a confirmation policy it never thought about.
   */
  gate: ConfirmationGate,
): ToolDefinition[] {
  const expanded: ToolDefinition[] = [];

  for (const tool of tools) {
    expanded.push(withConfirmation(resolveToolVariant(tool, client), gate));

    if (!isCapabilityAwareTool(tool)) continue;

    const mcpApp = tool.variants[McpClientCapability.McpApp];
    const usesMcpApp = mcpApp && client.capabilities.has(McpClientCapability.McpApp);
    if (!usesMcpApp) continue;

    for (const companion of mcpApp.appOnlyTools ?? []) {
      expanded.push({ ...companion, visibility: ['app'] });
    }

    // An MCP App supersedes the form flow for the agent, but the view itself may
    // still want to trigger one, so keep the elicitation variant reachable as an
    // app-only sibling instead of dropping it.
    const elicitation = tool.variants[McpClientCapability.Elicitation];
    if (elicitation && client.capabilities.has(McpClientCapability.Elicitation)) {
      const { variants: _superseded, ui: _noView, ...baseline } = tool;
      expanded.push(
        withConfirmation(
          {
            ...baseline,
            name: `${tool.name}_form`,
            description: `${tool.description} (form flow, callable by the ${tool.name} view)`,
            handler: elicitation.handler,
            visibility: ['app'],
          },
          gate,
        ),
      );
    }
  }

  return expanded;
}

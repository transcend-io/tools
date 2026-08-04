import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import {
  createErrorResult,
  EMPTY_CAPABILITY_REPORT,
  expandToolsForClient,
  isVisibleToModel,
  resolveToolVariant,
  SimpleLogger,
  type ClientCapabilityReport,
  type ToolDefinition,
  type TranscendRestClient,
} from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDocsTools } from '@transcend-io/mcp-server-docs';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';
import { createRenderUiTool, createUiGuideTool } from '@transcend-io/mcp-ui-json-render';

import type { TranscendGraphQLClient } from './graphql-client.js';

export interface UmbrellaToolClients {
  /** REST client for Sombra API */
  rest: TranscendRestClient;
  /** Composed GraphQL client with all domain mixins */
  graphql: TranscendGraphQLClient;
  /** Admin-dashboard base URL used to build deep links */
  dashboardUrl: string;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private jsonSchemaCache: Map<string, Record<string, unknown>> = new Map();
  private clients: UmbrellaToolClients;
  private logger = new SimpleLogger();

  constructor(clients: UmbrellaToolClients) {
    this.clients = clients;
    this.registerAllTools();
  }

  private registerAllTools(): void {
    this.registerToolsFromModule(getDocsTools(this.clients));
    this.registerToolsFromModule(getDSRTools(this.clients));
    this.registerToolsFromModule(getConsentTools(this.clients));
    this.registerToolsFromModule(getPreferenceTools(this.clients));
    this.registerToolsFromModule(getInventoryTools(this.clients));
    this.registerToolsFromModule(getDiscoveryTools(this.clients));
    this.registerToolsFromModule(getAssessmentTools(this.clients));
    this.registerToolsFromModule(getWorkflowTools(this.clients));
    this.registerToolsFromModule(getAdminTools(this.clients));
    // Generative dashboard view — agent composes a json-render spec after calling
    // domain tools (e.g. consent_get_aggregate_analytics). Private MVP package.
    // `ui_guide` ships alongside it because a model that has not read the guide
    // tends to hand-roll an HTML or Python dashboard instead of calling ui_render.
    this.registerToolsFromModule([createUiGuideTool(), createRenderUiTool()]);
  }

  private registerToolsFromModule(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) {
        this.logger.warn('Duplicate tool name - skipping', { toolName: tool.name });
        continue;
      }
      this.tools.set(tool.name, tool);
      this.jsonSchemaCache.set(
        tool.name,
        toJsonSchemaCompat(tool.zodSchema as any) as Record<string, unknown>,
      );
    }
  }

  /**
   * Tool descriptors as a host would see them.
   *
   * The serving path builds descriptors in `buildMcpServer` rather than here, so
   * this method exists for callers embedding the registry directly. It still
   * resolves capability variants and carries `_meta`, because a descriptor list
   * that quietly disagreed with what the server actually serves would be worse
   * than no method at all.
   */
  getToolList(
    /** Capabilities of the host being served; defaults to a host with none */
    client: ClientCapabilityReport = EMPTY_CAPABILITY_REPORT,
  ): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: {
      readOnlyHint: boolean;
      destructiveHint: boolean;
      idempotentHint: boolean;
    };
    _meta?: Record<string, unknown>;
  }> {
    return expandToolsForClient(Array.from(this.tools.values()), client)
      .filter((tool) => isVisibleToModel(tool))
      .map((tool) => {
        const resourceUri = tool.ui?.resource.uri;
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: this.jsonSchemaCache.get(tool.name) || { type: 'object', properties: {} },
          annotations: tool.annotations,
          ...(resourceUri && {
            _meta: { ui: { resourceUri }, 'ui/resourceUri': resourceUri },
          }),
        };
      });
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    /** Capabilities of the host being served; defaults to a host with none */
    client: ClientCapabilityReport = EMPTY_CAPABILITY_REPORT,
  ): Promise<unknown> {
    const registered = this.tools.get(name);
    if (!registered) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Resolve so the handler that runs matches the descriptor getToolList emitted.
    const tool = resolveToolVariant(registered, client);

    const parseResult = tool.zodSchema.safeParse(args);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((i: any) => `${i.path.join('.') || 'input'}: ${i.message}`)
        .join('; ');
      throw new Error(`Invalid input: ${issues}`);
    }

    try {
      return await tool.handler(parseResult.data);
    } catch (error) {
      return createErrorResult(error);
    }
  }

  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((tool) => tool.category === category);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      categories.add(tool.category);
    }
    return Array.from(categories);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolCount(): number {
    return this.tools.size;
  }
}

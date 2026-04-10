import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessments';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import {
  createErrorResult,
  type ToolDefinition,
  type TranscendRestClient,
} from '@transcend-io/mcp-server-core';
import { getDiscoveryTools } from '@transcend-io/mcp-server-discovery';
import { getDSRTools } from '@transcend-io/mcp-server-dsr';
import { getInventoryTools } from '@transcend-io/mcp-server-inventory';
import { getPreferenceTools } from '@transcend-io/mcp-server-preferences';
import { getWorkflowTools } from '@transcend-io/mcp-server-workflows';

import type { TranscendGraphQLClient } from './graphql-client.js';

export interface UmbrellaToolClients {
  /** REST client for Sombra API */
  rest: TranscendRestClient;
  /** Composed GraphQL client with all domain mixins */
  graphql: TranscendGraphQLClient;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private jsonSchemaCache: Map<string, Record<string, unknown>> = new Map();
  private clients: UmbrellaToolClients;

  constructor(clients: UmbrellaToolClients) {
    this.clients = clients;
    this.registerAllTools();
  }

  private registerAllTools(): void {
    this.registerToolsFromModule(getDSRTools(this.clients));
    this.registerToolsFromModule(getConsentTools(this.clients));
    this.registerToolsFromModule(getPreferenceTools(this.clients));
    this.registerToolsFromModule(getInventoryTools(this.clients));
    this.registerToolsFromModule(getDiscoveryTools(this.clients));
    this.registerToolsFromModule(getAssessmentTools(this.clients));
    this.registerToolsFromModule(getWorkflowTools(this.clients));
    this.registerToolsFromModule(getAdminTools(this.clients));
  }

  private registerToolsFromModule(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) {
        process.stderr.write(`Warning: Duplicate tool name "${tool.name}" - skipping\n`);
        continue;
      }
      this.tools.set(tool.name, tool);
      this.jsonSchemaCache.set(
        tool.name,
        toJsonSchemaCompat(tool.zodSchema as any) as Record<string, unknown>,
      );
    }
  }

  getToolList(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: {
      readOnlyHint: boolean;
      destructiveHint: boolean;
      idempotentHint: boolean;
    };
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.jsonSchemaCache.get(tool.name) || { type: 'object', properties: {} },
      annotations: tool.annotations,
    }));
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

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

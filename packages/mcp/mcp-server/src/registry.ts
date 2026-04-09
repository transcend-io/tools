import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessments';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
import type { ToolDefinition, TranscendRestClient } from '@transcend-io/mcp-server-core';
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
    }
  }

  getToolList(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
    annotations: {
      readOnlyHint: boolean;
      destructiveHint: boolean;
      idempotentHint: boolean;
    };
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
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
    return tool.handler(args);
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

  getToolCount(): number {
    return this.tools.size;
  }
}

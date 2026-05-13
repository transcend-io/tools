import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getAdminTools } from '@transcend-io/mcp-server-admin';
import { getAssessmentTools } from '@transcend-io/mcp-server-assessment';
import {
  createErrorResult,
  SimpleLogger,
  type ToolDefinition,
  type TranscendRestClient,
} from '@transcend-io/mcp-server-base';
import { getConsentTools } from '@transcend-io/mcp-server-consent';
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
  private inputJsonSchemaCache: Map<string, Record<string, unknown>> = new Map();
  private outputJsonSchemaCache: Map<string, Record<string, unknown>> = new Map();
  private clients: UmbrellaToolClients;
  private logger = new SimpleLogger();

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
        this.logger.warn('Duplicate tool name - skipping', { toolName: tool.name });
        continue;
      }
      this.tools.set(tool.name, tool);
      this.inputJsonSchemaCache.set(
        tool.name,
        toJsonSchemaCompat(tool.zodSchema as any) as Record<string, unknown>,
      );
      this.outputJsonSchemaCache.set(
        tool.name,
        toJsonSchemaCompat(tool.outputZodSchema as any) as Record<string, unknown>,
      );
    }
  }

  getToolList(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    annotations: {
      readOnlyHint: boolean;
      destructiveHint: boolean;
      idempotentHint: boolean;
    };
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: this.inputJsonSchemaCache.get(tool.name) || {
        type: 'object',
        properties: {},
      },
      outputSchema: this.outputJsonSchemaCache.get(tool.name),
      annotations: tool.annotations,
    }));
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
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
      const result = await tool.handler(parseResult.data);

      // Validate handler return against outputZodSchema. Failures are
      // non-fatal during rollout: log to stderr but still surface the raw
      // handler return as `structuredContent`.
      const outputParse = tool.outputZodSchema.safeParse(result);
      if (!outputParse.success) {
        const issues = outputParse.error.issues
          .map((i: any) => `${i.path.join('.') || 'output'}: ${i.message}`)
          .join('; ');
        process.stderr.write(
          `Warning: outputZodSchema validation failed for "${name}": ${issues}\n`,
        );
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: (outputParse.success ? outputParse.data : result) as Record<
          string,
          unknown
        >,
      };
    } catch (error) {
      const errorResult = createErrorResult(error);
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult) }],
        structuredContent: errorResult as Record<string, unknown>,
        isError: true,
      };
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

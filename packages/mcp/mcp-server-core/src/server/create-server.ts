import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SimpleLogger } from '../clients/graphql/base.js';
import { TranscendRestClient } from '../clients/rest-client.js';
import type { PromptDefinition } from '../prompts/types.js';
import type { ResourceDefinition } from '../resources/types.js';
import { createErrorResult, createToolResult } from '../tools/helpers.js';
import type { ToolDefinition, ToolClients } from '../tools/types.js';

export interface MCPServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Factory that returns tool definitions given API clients */
  getTools: (clients: ToolClients) => ToolDefinition[];
  /** Optional factory that returns prompt definitions (workflow templates) */
  getPrompts?: (clients: ToolClients) => PromptDefinition[];
  /** Optional factory that returns resource definitions (reference data) */
  getResources?: (clients: ToolClients) => ResourceDefinition[];
  /** Optional custom client factory */
  createClients?: (apiKey: string, sombraUrl: string, graphqlUrl: string) => ToolClients;
}

export async function createMCPServer(options: MCPServerOptions): Promise<void> {
  const logger = new SimpleLogger();

  const apiKey = process.env.TRANSCEND_API_KEY;
  const sombraUrl = process.env.TRANSCEND_API_URL || 'https://multi-tenant.sombra.transcend.io';
  const graphqlUrl = process.env.TRANSCEND_GRAPHQL_URL || 'https://api.transcend.io';

  if (!apiKey) {
    logger.error('TRANSCEND_API_KEY environment variable is required');
    process.exit(1);
  }

  logger.info('Initializing Transcend API clients...', { sombraUrl, graphqlUrl });

  const clients = options.createClients
    ? options.createClients(apiKey, sombraUrl, graphqlUrl)
    : {
        rest: new TranscendRestClient(apiKey, sombraUrl),
        graphql: new (await import('../clients/graphql/base.js')).TranscendGraphQLBase(
          apiKey,
          graphqlUrl,
        ),
      };

  const tools = options.getTools(clients);
  const toolMap = new Map<string, ToolDefinition>();
  const jsonSchemaCache = new Map<string, Record<string, unknown>>();

  for (const tool of tools) {
    if (toolMap.has(tool.name)) {
      logger.warn(`Duplicate tool name "${tool.name}" — skipping`);
      continue;
    }
    toolMap.set(tool.name, tool);
    jsonSchemaCache.set(
      tool.name,
      toJsonSchemaCompat(tool.zodSchema as any) as Record<string, unknown>,
    );
  }

  logger.info(`Registered ${toolMap.size} tools`, { toolCount: toolMap.size });

  const prompts = options.getPrompts?.(clients) ?? [];
  const promptMap = new Map<string, PromptDefinition>();
  for (const prompt of prompts) {
    if (promptMap.has(prompt.name)) {
      logger.warn(`Duplicate prompt name "${prompt.name}" — skipping`);
      continue;
    }
    promptMap.set(prompt.name, prompt);
  }

  const resources = options.getResources?.(clients) ?? [];
  const resourceMap = new Map<string, ResourceDefinition>();
  for (const resource of resources) {
    if (resourceMap.has(resource.uri)) {
      logger.warn(`Duplicate resource URI "${resource.uri}" — skipping`);
      continue;
    }
    resourceMap.set(resource.uri, resource);
  }

  if (promptMap.size > 0) {
    logger.info(`Registered ${promptMap.size} prompts`, { promptCount: promptMap.size });
  }
  if (resourceMap.size > 0) {
    logger.info(`Registered ${resourceMap.size} resources`, { resourceCount: resourceMap.size });
  }

  const capabilities: Record<string, Record<string, unknown>> = { tools: {} };
  if (promptMap.size > 0) capabilities.prompts = {};
  if (resourceMap.size > 0) capabilities.resources = {};

  const server = new Server({ name: options.name, version: options.version }, { capabilities });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing MCP tools');
    const toolList = Array.from(toolMap.entries()).map(([name, t]) => ({
      name: t.name,
      description: t.description,
      inputSchema: jsonSchemaCache.get(name) || { type: 'object', properties: {} },
      annotations: t.annotations,
    }));
    logger.info(`Returning ${toolList.length} tools`);
    return { tools: toolList };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Executing tool: ${name}`, { args: Object.keys(args || {}) });

    try {
      const tool = toolMap.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const parseResult = tool.zodSchema.safeParse(args || {});
      if (!parseResult.success) {
        const issues = parseResult.error.issues
          .map((i: any) => `${i.path.join('.') || 'input'}: ${i.message}`)
          .join('; ');
        const errorResult = createToolResult(false, undefined, `Invalid input: ${issues}`, {
          code: 'VALIDATION_ERROR',
          retryable: false,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }],
          isError: true,
        };
      }

      const result = await tool.handler(parseResult.data);
      logger.debug(`Tool ${name} completed successfully`);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      logger.error(`Error executing tool ${name}:`, error);
      return {
        content: [{ type: 'text', text: JSON.stringify(createErrorResult(error), null, 2) }],
        isError: true,
      };
    }
  });

  if (promptMap.size > 0) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.debug('Listing MCP prompts');
      return {
        prompts: Array.from(promptMap.values()).map((p) => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        })),
      };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Getting prompt: ${name}`);
      const prompt = promptMap.get(name);
      if (!prompt) {
        throw new Error(`Unknown prompt: ${name}`);
      }
      const messages = await prompt.handler(args ?? {});
      return { description: prompt.description, messages };
    });
  }

  if (resourceMap.size > 0) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Listing MCP resources');
      return {
        resources: Array.from(resourceMap.values()).map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType ?? 'text/plain',
        })),
      };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      logger.info(`Reading resource: ${uri}`);
      const resource = resourceMap.get(uri);
      if (!resource) {
        throw new Error(`Unknown resource: ${uri}`);
      }
      const text = await resource.handler();
      return {
        contents: [{ uri, text, mimeType: resource.mimeType ?? 'text/plain' }],
      };
    });
  }

  logger.info(`Starting ${options.name} v${options.version}...`, { toolCount: toolMap.size });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${options.name} started successfully`, {
    sombraUrl,
    graphqlUrl,
    tools: toolMap.size,
    prompts: promptMap.size,
    resources: resourceMap.size,
  });
}

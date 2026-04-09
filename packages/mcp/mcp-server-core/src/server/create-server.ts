import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { SimpleLogger } from '../clients/graphql/base.js';
import { TranscendRestClient } from '../clients/rest-client.js';
import { createErrorResult, createToolResult } from '../tools/helpers.js';
import type { ToolDefinition, ToolClients } from '../tools/types.js';

export interface MCPServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Factory that returns tool definitions given API clients */
  getTools: (clients: ToolClients) => ToolDefinition[];
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

  const server = new Server(
    { name: options.name, version: options.version },
    { capabilities: { tools: {} } },
  );

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

  logger.info(`Starting ${options.name} v${options.version}...`, { toolCount: toolMap.size });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${options.name} started successfully`, {
    sombraUrl,
    graphqlUrl,
    tools: toolMap.size,
  });
}

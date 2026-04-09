import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { SimpleLogger } from '../clients/graphql/base.js';
import { TranscendRestClient } from '../clients/rest-client.js';
import type { ToolDefinition, ToolClients } from '../tools/types.js';

export interface MCPServerOptions {
  name: string;
  version: string;
  getTools: (clients: ToolClients) => ToolDefinition[];
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
  for (const tool of tools) {
    if (toolMap.has(tool.name)) {
      logger.warn(`Duplicate tool name "${tool.name}" — skipping`);
      continue;
    }
    toolMap.set(tool.name, tool);
  }

  logger.info(`Registered ${toolMap.size} tools`, { toolCount: toolMap.size });

  const server = new Server(
    { name: options.name, version: options.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing MCP tools');
    const toolList = Array.from(toolMap.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
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
      const result = await tool.handler((args || {}) as Record<string, unknown>);
      logger.debug(`Tool ${name} completed successfully`);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error executing tool ${name}:`, error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
                tool: name,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
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

#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SimpleLogger, TranscendRestClient } from '@transcend-io/mcp-server-core';

import { TranscendGraphQLClient } from './graphql-client.js';
import { ToolRegistry } from './registry.js';

const VERSION = '3.0.2';

const logger = new SimpleLogger();

const apiKey = process.env.TRANSCEND_API_KEY;
const sombraUrl = process.env.TRANSCEND_API_URL || 'https://multi-tenant.sombra.transcend.io';
const graphqlUrl = process.env.TRANSCEND_GRAPHQL_URL || 'https://api.transcend.io';

if (!apiKey) {
  logger.error('TRANSCEND_API_KEY environment variable is required');
  process.exit(1);
}

logger.info('Initializing Transcend API clients...', { sombraUrl, graphqlUrl });

const restClient = new TranscendRestClient(apiKey, sombraUrl);
const graphqlClient = new TranscendGraphQLClient(apiKey, graphqlUrl);

const toolRegistry = new ToolRegistry({
  rest: restClient,
  graphql: graphqlClient,
});

logger.info(
  `Registered ${toolRegistry.getToolCount()} tools across ${toolRegistry.getCategories().length} categories`,
  {
    categories: toolRegistry.getCategories(),
    toolCount: toolRegistry.getToolCount(),
  },
);

const server = new Server(
  { name: 'transcend-mcp-server', version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug('Listing MCP tools');
  const tools = toolRegistry.getToolList();
  logger.info(`Returning ${tools.length} tools`);
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Executing tool: ${name}`, { args: Object.keys(args || {}) });

  try {
    const result = await toolRegistry.executeTool(name, (args || {}) as Record<string, unknown>);
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

async function main(): Promise<void> {
  logger.info(`Starting Transcend MCP Server v${VERSION}...`, {
    toolCount: toolRegistry.getToolCount(),
    categories: toolRegistry.getCategories(),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Transcend MCP Server started successfully', {
    sombraUrl,
    graphqlUrl,
    tools: toolRegistry.getToolCount(),
  });
}

main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

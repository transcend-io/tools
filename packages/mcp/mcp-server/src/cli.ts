#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  buildMcpServer,
  parseTransportArgs,
  resolveApiKey,
  runMcpHttp,
  SimpleLogger,
  TranscendRestClient,
} from '@transcend-io/mcp-server-core';

import { TranscendGraphQLClient } from './graphql-client.js';
import { ToolRegistry } from './registry.js';

const VERSION = '3.0.2';

function createToolRegistry(apiKey: string, sombraUrl: string, graphqlUrl: string): ToolRegistry {
  const restClient = new TranscendRestClient(apiKey, sombraUrl);
  const graphqlClient = new TranscendGraphQLClient(apiKey, graphqlUrl);
  return new ToolRegistry({ rest: restClient, graphql: graphqlClient });
}

async function main(): Promise<void> {
  const logger = new SimpleLogger();
  const config = parseTransportArgs();
  const sombraUrl = process.env.TRANSCEND_API_URL || 'https://multi-tenant.sombra.transcend.io';
  const graphqlUrl = process.env.TRANSCEND_GRAPHQL_URL || 'https://api.transcend.io';

  if (config.transport === 'http') {
    await runMcpHttp(
      {
        name: 'transcend-mcp-server',
        version: VERSION,
        createServer: async (apiKey: string) => {
          logger.info('Creating unified MCP server for new HTTP session...', {
            sombraUrl,
            graphqlUrl,
          });
          const registry = createToolRegistry(apiKey, sombraUrl, graphqlUrl);
          return buildMcpServer({
            name: 'transcend-mcp-server',
            version: VERSION,
            tools: registry.getAllTools(),
          });
        },
      },
      config,
    );
    return;
  }

  // stdio mode
  const apiKey = resolveApiKey();
  logger.info('Initializing Transcend API clients...', { sombraUrl, graphqlUrl });

  const toolRegistry = createToolRegistry(apiKey, sombraUrl, graphqlUrl);

  logger.info(
    `Registered ${toolRegistry.getToolCount()} tools across ${toolRegistry.getCategories().length} categories`,
    {
      categories: toolRegistry.getCategories(),
      toolCount: toolRegistry.getToolCount(),
    },
  );

  const server = buildMcpServer({
    name: 'transcend-mcp-server',
    version: VERSION,
    tools: toolRegistry.getAllTools(),
  });

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
  const logger = new SimpleLogger();
  logger.error('Failed to start server:', error);
  process.exit(1);
});

#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  buildMcpServer,
  parseTransportArgs,
  resolveAuth,
  runMcpHttp,
  SimpleLogger,
  TranscendRestClient,
  type AuthCredentials,
} from '@transcend-io/mcp-server-base';

import { TranscendGraphQLClient } from './graphql-client.js';
import { ToolRegistry } from './registry.js';

const VERSION = '3.0.2';

function createToolRegistry(
  auth: AuthCredentials | null,
  sombraUrl: string,
  graphqlUrl: string,
): ToolRegistry {
  const restClient = new TranscendRestClient(auth, sombraUrl);
  const graphqlClient = new TranscendGraphQLClient(auth, graphqlUrl);
  return new ToolRegistry({ rest: restClient, graphql: graphqlClient });
}

async function main(): Promise<void> {
  const logger = new SimpleLogger();
  const config = parseTransportArgs();
  const sombraUrl = process.env.SOMBRA_URL || 'https://multi-tenant.sombra.transcend.io';
  const graphqlUrl = process.env.TRANSCEND_API_URL || 'https://api.transcend.io';

  if (config.transport === 'http') {
    await runMcpHttp(
      {
        name: 'transcend-mcp',
        version: VERSION,
        createServer: async (auth) => {
          logger.info('Creating unified MCP server for new HTTP session...', {
            sombraUrl,
            graphqlUrl,
            authType: auth?.type ?? 'none',
          });
          const registry = createToolRegistry(auth, sombraUrl, graphqlUrl);
          return buildMcpServer({
            name: 'transcend-mcp',
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
  const auth = resolveAuth();
  logger.info('Initializing Transcend API clients...', { sombraUrl, graphqlUrl });

  const toolRegistry = createToolRegistry(auth, sombraUrl, graphqlUrl);

  logger.info(
    `Registered ${toolRegistry.getToolCount()} tools across ${toolRegistry.getCategories().length} categories`,
    {
      categories: toolRegistry.getCategories(),
      toolCount: toolRegistry.getToolCount(),
    },
  );

  const server = buildMcpServer({
    name: 'transcend-mcp',
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

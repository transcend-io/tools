#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  buildMcpServer,
  createTranscendRestClient,
  isOAuthModeEnabled,
  parseTransportArgs,
  resolveStdioStartupAuthOptional,
  configureOAuthScopes,
  resolveMcpDashboardUrl,
  resolveMcpGraphqlUrl,
  readSombraEnvConfig,
  runMcpHttp,
  SimpleLogger,
  type AuthCredentials,
} from '@transcend-io/mcp-server-base';

import packageJson from '../package.json' with { type: 'json' };
import { TranscendGraphQLClient } from './graphql-client.js';
import { UMBRELLA_OAUTH_SCOPES } from './oauth-scopes.js';
import { ToolRegistry } from './registry.js';
import { UMBRELLA_DOCS_SERVER_INSTRUCTIONS } from './server-instructions.js';

const VERSION = packageJson.version;

const buildServerOptions = {
  name: 'transcend-mcp',
  version: VERSION,
  instructions: UMBRELLA_DOCS_SERVER_INSTRUCTIONS,
} as const;

function createToolRegistry(
  auth: AuthCredentials | null,
  sombraUrl: string | undefined,
  sombraCustomerKey: string | undefined,
  graphqlUrl: string,
  dashboardUrl: string,
): ToolRegistry {
  const graphqlClient = new TranscendGraphQLClient(auth, graphqlUrl);
  const restClient = createTranscendRestClient(auth, graphqlClient, {
    sombraUrl,
    sombraCustomerKey,
  });
  return new ToolRegistry({ rest: restClient, graphql: graphqlClient, dashboardUrl });
}

async function main(): Promise<void> {
  const config = parseTransportArgs();
  const isHttpTransport = config.transport === 'http';
  SimpleLogger.setInfoToStdout(isHttpTransport);
  const logger = new SimpleLogger();
  const { sombraUrl, sombraCustomerKey } = readSombraEnvConfig();
  const dashboardUrl = resolveMcpDashboardUrl();
  const graphqlUrl = await resolveMcpGraphqlUrl(logger);

  if (isHttpTransport) {
    await runMcpHttp(
      {
        name: 'transcend-mcp',
        version: VERSION,
        createServer: async (auth) => {
          logger.info('Creating unified MCP server for new HTTP session...', {
            sombraUrl: sombraUrl ?? '(lazy GraphQL resolve)',
            graphqlUrl,
            dashboardUrl,
            authType: auth?.type ?? 'none',
            hasSombraCustomerKey: Boolean(sombraCustomerKey),
          });
          const registry = createToolRegistry(
            auth,
            sombraUrl,
            sombraCustomerKey,
            graphqlUrl,
            dashboardUrl,
          );
          return buildMcpServer({
            ...buildServerOptions,
            tools: registry.getAllTools(),
          });
        },
      },
      config,
    );
    return;
  }

  // stdio mode
  configureOAuthScopes(UMBRELLA_OAUTH_SCOPES);
  const auth = resolveStdioStartupAuthOptional();
  logger.info('Initializing Transcend API clients...', {
    sombraUrl: sombraUrl ?? '(lazy GraphQL resolve)',
    graphqlUrl,
    dashboardUrl,
    authType: auth?.type ?? (isOAuthModeEnabled() ? 'oauth-pending' : 'none'),
  });

  const toolRegistry = createToolRegistry(
    auth,
    sombraUrl,
    sombraCustomerKey,
    graphqlUrl,
    dashboardUrl,
  );

  logger.info(
    `Registered ${toolRegistry.getToolCount()} tools across ${toolRegistry.getCategories().length} categories`,
    {
      categories: toolRegistry.getCategories(),
      toolCount: toolRegistry.getToolCount(),
    },
  );

  const server = buildMcpServer({
    ...buildServerOptions,
    tools: toolRegistry.getAllTools(),
  });

  logger.info(`Starting Transcend MCP Server v${VERSION}...`, {
    toolCount: toolRegistry.getToolCount(),
    categories: toolRegistry.getCategories(),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Transcend MCP Server started successfully', {
    sombraUrl: sombraUrl ?? '(lazy GraphQL resolve)',
    graphqlUrl,
    dashboardUrl,
    tools: toolRegistry.getToolCount(),
  });
}

main().catch((error) => {
  const logger = new SimpleLogger();
  logger.error('Failed to start server:', error);
  process.exit(1);
});

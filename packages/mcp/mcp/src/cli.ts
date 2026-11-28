#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  buildMcpServer,
  createTranscendRestClient,
  isOAuthModeEnabled,
  McpTransport,
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
import { parseConfigResourceAllowlistFromEnv } from '@transcend-io/mcp-server-config';
import { getConsentPrompts } from '@transcend-io/mcp-server-consent';
import { getDsrPrompts } from '@transcend-io/mcp-server-dsr';
import { TranscendMcpServer } from '@transcend-io/sdk';

import packageJson from '../package.json' with { type: 'json' };
import { TranscendGraphQLClient } from './graphql-client.js';
import {
  allowlistIncludesDocs,
  allowlistIncludesServer,
  parseMcpServerAllowlistFromEnv,
  resolveMcpServerAllowlist,
  type McpServerAllowlist,
} from './mcp-server-allowlist.js';
import { resolveUmbrellaOAuthScopes } from './oauth-scopes.js';
import { ToolRegistry } from './registry.js';
import {
  UMBRELLA_DOCS_SERVER_INSTRUCTIONS,
  UMBRELLA_SERVER_INSTRUCTIONS,
} from './server-instructions.js';

const VERSION = packageJson.version;

function buildServerOptions(allowlist: McpServerAllowlist) {
  const prompts = [
    ...(allowlistIncludesServer(allowlist, TranscendMcpServer.Consent) ? getConsentPrompts() : []),
    ...(allowlistIncludesServer(allowlist, TranscendMcpServer.Dsr) ? getDsrPrompts() : []),
  ];

  return {
    name: 'transcend-mcp',
    version: VERSION,
    instructions: allowlistIncludesDocs(allowlist)
      ? UMBRELLA_DOCS_SERVER_INSTRUCTIONS
      : UMBRELLA_SERVER_INSTRUCTIONS,
    prompts,
  };
}

function createToolRegistry(
  auth: AuthCredentials | null,
  sombraUrl: string | undefined,
  sombraCustomerKey: string | undefined,
  requireMultiTenantSombra: boolean,
  graphqlUrl: string,
  dashboardUrl: string,
  allowlist: McpServerAllowlist,
): ToolRegistry {
  const graphqlClient = new TranscendGraphQLClient(auth, graphqlUrl);
  const restClient = createTranscendRestClient(auth, graphqlClient, {
    sombraUrl,
    sombraCustomerKey,
    requireMultiTenantSombra,
  });
  return new ToolRegistry(
    {
      rest: restClient,
      graphql: graphqlClient,
      dashboardUrl,
      transcendApiUrl: graphqlUrl,
      auth,
    },
    allowlist,
  );
}

function resolveStartupAllowlist(): McpServerAllowlist {
  try {
    return resolveMcpServerAllowlist();
  } catch (error) {
    const logger = new SimpleLogger();
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const allowlist = resolveStartupAllowlist();
  const serverOptions = buildServerOptions(allowlist);
  const config = parseTransportArgs();
  const isHttpTransport = config.transport === McpTransport.Http;
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
        // Only used when --public-url / TRANSCEND_MCP_PUBLIC_URL is set (OAuth discovery).
        authorizationServerUrl: graphqlUrl,
        scopesSupported: resolveUmbrellaOAuthScopes(
          allowlist,
          parseConfigResourceAllowlistFromEnv(),
        ),
        createServer: async (auth) => {
          logger.info('Creating unified MCP server for new HTTP session...', {
            sombraUrl: sombraUrl ?? '(lazy GraphQL resolve)',
            graphqlUrl,
            dashboardUrl,
            authType: auth?.type ?? 'none',
            hasSombraCustomerKey: Boolean(sombraCustomerKey),
            mcpServers: parseMcpServerAllowlistFromEnv() ? [...allowlist].join(',') : '(all)',
          });
          const registry = createToolRegistry(
            auth,
            sombraUrl,
            sombraCustomerKey,
            Boolean(config.publicUrl),
            graphqlUrl,
            dashboardUrl,
            allowlist,
          );
          return buildMcpServer({
            ...serverOptions,
            tools: registry.getAllTools(),
            transport: McpTransport.Http,
          });
        },
      },
      config,
    );
    return;
  }

  // stdio mode
  configureOAuthScopes(
    resolveUmbrellaOAuthScopes(allowlist, parseConfigResourceAllowlistFromEnv()),
  );
  const auth = resolveStdioStartupAuthOptional();
  logger.info('Initializing Transcend API clients...', {
    sombraUrl: sombraUrl ?? '(lazy GraphQL resolve)',
    graphqlUrl,
    dashboardUrl,
    authType: auth?.type ?? (isOAuthModeEnabled() ? 'oauth-pending' : 'none'),
    mcpServers: parseMcpServerAllowlistFromEnv() ? [...allowlist].join(',') : '(all)',
  });

  const toolRegistry = createToolRegistry(
    auth,
    sombraUrl,
    sombraCustomerKey,
    false,
    graphqlUrl,
    dashboardUrl,
    allowlist,
  );

  logger.info(
    `Registered ${toolRegistry.getToolCount()} tools across ${toolRegistry.getCategories().length} categories`,
    {
      categories: toolRegistry.getCategories(),
      toolCount: toolRegistry.getToolCount(),
    },
  );

  const server = buildMcpServer({
    ...serverOptions,
    tools: toolRegistry.getAllTools(),
    transport: McpTransport.Stdio,
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

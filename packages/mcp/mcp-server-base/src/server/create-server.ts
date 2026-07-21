import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AuthCredentials } from '../auth.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import { TranscendRestClient } from '../clients/rest-client.js';
import { DEFAULT_SOMBRA_URL } from '../defaults.js';
import { isOAuthModeEnabled } from '../oauth/config.js';
import { resolveStdioStartupAuth } from '../oauth/resolve-stdio-auth.js';
import { configureOAuthScopes } from '../oauth/scopes.js';
import type { ResourceDefinition, ToolClients, ToolDefinition } from '../tools/types.js';
import { buildMcpServer } from './build-server.js';
import { parseTransportArgs } from './parse-args.js';
import { resolveMcpDashboardUrl } from './resolve-dashboard-url.js';
import { resolveMcpGraphqlUrl } from './resolve-graphql-url.js';
import { runMcpHttp } from './run-http.js';

/**
 * Arguments for a custom client factory.
 *
 * Provided as an object rather than positional args so adding fields (like
 * `dashboardUrl`) is non-breaking for in-tree callers and easy to extend.
 */
export interface CreateClientsArgs {
  /** Authenticated user credentials, or `null` for unauthenticated stdio sessions */
  auth: AuthCredentials | null;
  /** Sombra REST API URL */
  sombraUrl: string;
  /** Transcend GraphQL API URL */
  graphqlUrl: string;
  /** Resolved admin-dashboard URL for deep links */
  dashboardUrl: string;
}

export interface MCPServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /**
   * When false, starts without API key or OAuth and skips OAuth client verification at startup.
   * Per-call auth is controlled per tool via {@link ToolDefinition.requireAuth}. Default true.
   */
  requireStartupAuth?: boolean;
  /** Domain OAuth scopes (offline_access is added automatically) */
  oauthScopes: readonly string[];
  /** Factory that returns tool definitions given API clients */
  getTools: (clients: ToolClients) => ToolDefinition[];
  /**
   * Optional factory that returns MCP resources (e.g. MCP App HTML views).
   * When provided, the server advertises the `resources` capability.
   */
  getResources?: (clients: ToolClients) => ResourceDefinition[];
  /**
   * Optional custom client factory. Receives a {@link CreateClientsArgs}
   * object so new fields can be added without breaking call sites.
   */
  createClients?: (args: CreateClientsArgs) => ToolClients;
  /** Optional MCP initialize instructions injected into the client system prompt. */
  instructions?: string;
}

async function buildClients(
  args: CreateClientsArgs,
  factory?: MCPServerOptions['createClients'],
): Promise<ToolClients> {
  if (factory) return factory(args);
  return {
    rest: new TranscendRestClient(args.auth, args.sombraUrl),
    graphql: new (await import('../clients/graphql/base.js')).TranscendGraphQLBase(
      args.auth,
      args.graphqlUrl,
    ),
    dashboardUrl: args.dashboardUrl,
  };
}

/**
 * Bootstraps a Transcend MCP server using either stdio or HTTP transport.
 *
 * Transport is selected via `--transport stdio|http` CLI flag (default: stdio).
 * In HTTP mode, each client session gets its own Server and transport instance,
 * authenticated via session cookie or API key header.
 */
export async function createMCPServer(options: MCPServerOptions): Promise<void> {
  const requireStartupAuth = options.requireStartupAuth !== false;
  configureOAuthScopes(options.oauthScopes);

  const config = parseTransportArgs();
  const isHttpTransport = config.transport === 'http';
  SimpleLogger.setInfoToStdout(isHttpTransport);
  const logger = new SimpleLogger();
  const sombraUrl = process.env.SOMBRA_URL || DEFAULT_SOMBRA_URL;
  const dashboardUrl = resolveMcpDashboardUrl();
  const graphqlUrl = await resolveMcpGraphqlUrl(logger, { requireStartupAuth });

  if (isHttpTransport) {
    await runMcpHttp(
      {
        name: options.name,
        version: options.version,
        createServer: async (auth) => {
          logger.info('Creating MCP server for new HTTP session...', {
            sombraUrl,
            graphqlUrl,
            dashboardUrl,
            authType: auth?.type ?? 'none',
          });
          const clients = await buildClients(
            { auth, sombraUrl, graphqlUrl, dashboardUrl },
            options.createClients,
          );
          const tools = options.getTools(clients);
          const resources = options.getResources?.(clients) ?? [];
          return buildMcpServer({
            name: options.name,
            version: options.version,
            tools,
            resources,
            instructions: options.instructions,
          });
        },
      },
      config,
    );
    return;
  }

  // stdio mode — single process, single Server
  const auth = requireStartupAuth ? resolveStdioStartupAuth() : null;
  const clients = await buildClients(
    { auth, sombraUrl, graphqlUrl, dashboardUrl },
    options.createClients,
  );
  const tools = options.getTools(clients);
  const resources = options.getResources?.(clients) ?? [];
  const server = buildMcpServer({
    name: options.name,
    version: options.version,
    tools,
    resources,
    instructions: options.instructions,
  });

  logger.info(`Starting ${options.name} v${options.version}...`, {
    toolCount: tools.length,
    resourceCount: resources.length,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${options.name} started successfully`, {
    sombraUrl,
    graphqlUrl,
    dashboardUrl,
    tools: tools.length,
  });
}

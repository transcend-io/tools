import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AuthCredentials } from '../auth.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import { TranscendRestClient } from '../clients/rest-client.js';
import {
  DEFAULT_DASHBOARD_URL,
  DEFAULT_SOMBRA_URL,
  DEFAULT_TRANSCEND_API_URL,
} from '../defaults.js';
import type { ToolClients, ToolDefinition } from '../tools/types.js';
import { buildMcpServer } from './build-server.js';
import { parseTransportArgs } from './parse-args.js';
import { resolveAuth } from './resolve-auth.js';
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
  /** Factory that returns tool definitions given API clients */
  getTools: (clients: ToolClients) => ToolDefinition[];
  /**
   * Optional custom client factory. Receives a {@link CreateClientsArgs}
   * object so new fields can be added without breaking call sites.
   */
  createClients?: (args: CreateClientsArgs) => ToolClients;
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
  const config = parseTransportArgs();
  const isHttpTransport = config.transport === 'http';
  SimpleLogger.setInfoToStdout(isHttpTransport);
  const logger = new SimpleLogger();
  const sombraUrl = process.env.SOMBRA_URL || DEFAULT_SOMBRA_URL;
  const graphqlUrl = process.env.TRANSCEND_API_URL || DEFAULT_TRANSCEND_API_URL;
  const dashboardUrl = process.env.TRANSCEND_DASHBOARD_URL || DEFAULT_DASHBOARD_URL;

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
          return buildMcpServer({ name: options.name, version: options.version, tools });
        },
      },
      config,
    );
    return;
  }

  // stdio mode — single process, single Server
  const auth = resolveAuth();
  logger.info('Initializing Transcend API clients...', { sombraUrl, graphqlUrl, dashboardUrl });
  const clients = await buildClients(
    { auth, sombraUrl, graphqlUrl, dashboardUrl },
    options.createClients,
  );
  const tools = options.getTools(clients);
  const server = buildMcpServer({ name: options.name, version: options.version, tools });

  logger.info(`Starting ${options.name} v${options.version}...`, { toolCount: tools.length });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${options.name} started successfully`, {
    sombraUrl,
    graphqlUrl,
    dashboardUrl,
    tools: tools.length,
  });
}

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AuthCredentials } from '../auth.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import { TranscendRestClient } from '../clients/rest-client.js';
import type { ToolClients, ToolDefinition } from '../tools/types.js';
import { buildMcpServer } from './build-server.js';
import { parseTransportArgs } from './parse-args.js';
import { resolveAuth } from './resolve-auth.js';
import { runMcpHttp } from './run-http.js';

export interface MCPServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Factory that returns tool definitions given API clients */
  getTools: (clients: ToolClients) => ToolDefinition[];
  /** Optional custom client factory */
  createClients?: (auth: AuthCredentials, sombraUrl: string, graphqlUrl: string) => ToolClients;
}

async function buildClients(
  auth: AuthCredentials,
  sombraUrl: string,
  graphqlUrl: string,
  factory?: MCPServerOptions['createClients'],
): Promise<ToolClients> {
  if (factory) return factory(auth, sombraUrl, graphqlUrl);
  return {
    rest: new TranscendRestClient(auth, sombraUrl),
    graphql: new (await import('../clients/graphql/base.js')).TranscendGraphQLBase(
      auth,
      graphqlUrl,
    ),
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
  const logger = new SimpleLogger();
  const config = parseTransportArgs();
  const sombraUrl = process.env.TRANSCEND_API_URL || 'https://multi-tenant.sombra.transcend.io';
  const graphqlUrl = process.env.TRANSCEND_GRAPHQL_URL || 'https://api.transcend.io';

  if (config.transport === 'http') {
    await runMcpHttp(
      {
        name: options.name,
        version: options.version,
        createServer: async (auth) => {
          logger.info('Creating MCP server for new HTTP session...', {
            sombraUrl,
            graphqlUrl,
            authType: auth.type,
          });
          const clients = await buildClients(auth, sombraUrl, graphqlUrl, options.createClients);
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
  logger.info('Initializing Transcend API clients...', { sombraUrl, graphqlUrl });
  const clients = await buildClients(auth, sombraUrl, graphqlUrl, options.createClients);
  const tools = options.getTools(clients);
  const server = buildMcpServer({ name: options.name, version: options.version, tools });

  logger.info(`Starting ${options.name} v${options.version}...`, { toolCount: tools.length });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${options.name} started successfully`, {
    sombraUrl,
    graphqlUrl,
    tools: tools.length,
  });
}

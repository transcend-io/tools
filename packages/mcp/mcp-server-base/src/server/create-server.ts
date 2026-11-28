import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AuthCredentials } from '../auth.js';
import { SimpleLogger, TranscendGraphQLBase } from '../clients/graphql/base.js';
import { runOAuthLoginCommand } from '../oauth/login-command.js';
import {
  resolveStdioStartupAuth,
  resolveStdioStartupAuthOptional,
} from '../oauth/resolve-stdio-auth.js';
import { configureOAuthScopes, mergeOAuthScopes } from '../oauth/scopes.js';
import type { PromptDefinition } from '../prompts/types.js';
import type { ToolClients, ToolDefinition } from '../tools/types.js';
import { buildMcpServer } from './build-server.js';
import { parseTransportArgs } from './parse-args.js';
import { resolveMcpDashboardUrl } from './resolve-dashboard-url.js';
import { resolveMcpGraphqlUrl } from './resolve-graphql-url.js';
import { createTranscendRestClient, readSombraEnvConfig } from './resolve-sombra-url.js';
import { runMcpHttp } from './run-http.js';
import { McpTransport } from './transport.js';

/**
 * Arguments for a custom client factory.
 *
 * Provided as an object rather than positional args so adding fields (like
 * `dashboardUrl`) is non-breaking for in-tree callers and easy to extend.
 */
export interface CreateClientsArgs {
  /** Authenticated user credentials, or `null` for unauthenticated stdio sessions */
  auth: AuthCredentials | null;
  /**
   * Sticky Sombra host override from `SOMBRA_URL`.
   * When unset, the REST client lazy-resolves `organization.sombra.customerUrl`.
   */
  sombraUrl?: string;
  /**
   * Optional Sombra customer-ingress API key from `SOMBRA_CUSTOMER_KEY`.
   * Sent as `X-Sombra-Authorization` when present.
   */
  sombraCustomerKey?: string;
  /**
   * True when Transcend hosts this server. The REST client must then refuse
   * organizations that self-host Sombra, whose data stays end-to-end encrypted.
   */
  requireMultiTenantSombra: boolean;
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
   * When false, startup does not require credentials, but optional env auth is still resolved
   * for signed-in tools. OAuth client verification still runs when OAuth env vars are set.
   * Per-call auth is controlled per tool via {@link ToolDefinition.requireAuth}. Default true.
   */
  requireStartupAuth?: boolean;
  /** Domain OAuth scopes (offline_access is added automatically) */
  oauthScopes: readonly string[];
  /** Factory that returns tool definitions given API clients */
  getTools: (clients: ToolClients) => ToolDefinition[];
  /** Optional factory that returns prompt definitions (workflow templates) */
  getPrompts?: (clients: ToolClients) => PromptDefinition[];
  /**
   * Optional custom client factory. Receives a {@link CreateClientsArgs}
   * object so new fields can be added without breaking call sites.
   */
  createClients?: (args: CreateClientsArgs) => ToolClients;
  /** Optional MCP initialize instructions injected into the client system prompt. */
  instructions?: string;
}

function buildClients(
  args: CreateClientsArgs,
  factory?: MCPServerOptions['createClients'],
): ToolClients {
  if (factory) return factory(args);
  const graphql = new TranscendGraphQLBase(args.auth, args.graphqlUrl);
  return {
    rest: createTranscendRestClient(args.auth, graphql, {
      sombraUrl: args.sombraUrl,
      sombraCustomerKey: args.sombraCustomerKey,
      requireMultiTenantSombra: args.requireMultiTenantSombra,
    }),
    graphql,
    dashboardUrl: args.dashboardUrl,
  };
}

/**
 * Bootstraps a Transcend MCP server using either stdio or HTTP transport.
 *
 * A first argument of `status` or `logout` manages the saved OAuth login instead
 * of starting the server.
 *
 * Transport is selected via `--transport stdio|http` CLI flag (default: stdio).
 * In HTTP mode, each client session gets its own Server and transport instance,
 * authenticated via session cookie or API key header.
 */
export async function createMCPServer(options: MCPServerOptions): Promise<void> {
  const loginCommandExitCode = await runOAuthLoginCommand();
  if (loginCommandExitCode !== undefined) {
    process.exitCode = loginCommandExitCode;
    return;
  }

  const requireStartupAuth = options.requireStartupAuth !== false;
  configureOAuthScopes(options.oauthScopes);

  const config = parseTransportArgs();
  const isHttpTransport = config.transport === McpTransport.Http;
  SimpleLogger.setInfoToStdout(isHttpTransport);
  const logger = new SimpleLogger();
  const { sombraUrl, sombraCustomerKey } = readSombraEnvConfig();
  const dashboardUrl = resolveMcpDashboardUrl();
  const graphqlUrl = await resolveMcpGraphqlUrl(logger, { requireStartupAuth });

  if (isHttpTransport) {
    await runMcpHttp(
      {
        name: options.name,
        version: options.version,
        authorizationServerUrl: graphqlUrl,
        scopesSupported: mergeOAuthScopes(options.oauthScopes),
        createServer: async (auth) => {
          logger.info('Creating MCP server for new HTTP session...', {
            sombraUrl: sombraUrl ?? '(lazy GraphQL resolve)',
            graphqlUrl,
            dashboardUrl,
            authType: auth?.type ?? 'none',
            hasSombraCustomerKey: Boolean(sombraCustomerKey),
          });
          const clients = buildClients(
            {
              auth,
              sombraUrl,
              sombraCustomerKey,
              requireMultiTenantSombra: Boolean(config.publicUrl),
              graphqlUrl,
              dashboardUrl,
            },
            options.createClients,
          );
          const tools = options.getTools(clients);
          const prompts = options.getPrompts?.(clients) ?? [];
          return buildMcpServer({
            name: options.name,
            version: options.version,
            tools,
            prompts,
            instructions: options.instructions,
            transport: McpTransport.Http,
          });
        },
      },
      config,
    );
    return;
  }

  // stdio mode — single process, single Server
  const auth = requireStartupAuth ? resolveStdioStartupAuth() : resolveStdioStartupAuthOptional();
  const clients = buildClients(
    {
      auth,
      sombraUrl,
      sombraCustomerKey,
      requireMultiTenantSombra: false,
      graphqlUrl,
      dashboardUrl,
    },
    options.createClients,
  );
  const tools = options.getTools(clients);
  const prompts = options.getPrompts?.(clients) ?? [];
  const server = buildMcpServer({
    name: options.name,
    version: options.version,
    tools,
    prompts,
    instructions: options.instructions,
    transport: McpTransport.Stdio,
  });

  logger.info(`Starting ${options.name} v${options.version}...`, {
    toolCount: tools.length,
    promptCount: prompts.length,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${options.name} started successfully`, {
    sombraUrl: sombraUrl ?? '(lazy GraphQL resolve)',
    graphqlUrl,
    dashboardUrl,
    tools: tools.length,
  });
}

import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { getRequestAuth, requestAuthContext } from '../auth-context.js';
import { ASSUME_CAPABILITIES_ENV_VAR, assumedCapabilitiesFromEnv } from '../capabilities/assume.js';
import { deriveClientCapabilities, describeCapabilities } from '../capabilities/derive.js';
import { EMPTY_CAPABILITY_REPORT, type ClientCapabilityReport } from '../capabilities/types.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import { getRequestMcpCaller } from '../mcp-caller-context.js';
import { mcpSessionContext } from '../mcp-session-context.js';
import { ensureLazyOAuthAuth, getLazyOAuthCredentials } from '../oauth/lazy-auth.js';
import { toolCallContext } from '../tool-call-context.js';
import { createErrorResult, createToolResult } from '../tools/helpers.js';
import type { ToolDefinition } from '../tools/types.js';

export interface BuildMcpServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Pre-constructed tool definitions */
  tools: ToolDefinition[];
  /** Optional MCP initialize instructions injected into the client system prompt. */
  instructions?: string;
}

/**
 * Creates an MCP {@link Server} with ListTools and CallTool handlers registered
 * from the given tool definitions. Does not connect any transport — the caller
 * is responsible for creating a transport and calling `server.connect(transport)`.
 */
export function buildMcpServer(options: BuildMcpServerOptions): Server {
  const logger = new SimpleLogger();
  const toolMap = new Map<string, ToolDefinition>();
  const jsonSchemaCache = new Map<string, Record<string, unknown>>();

  for (const tool of options.tools) {
    if (toolMap.has(tool.name)) {
      logger.warn(`Duplicate tool name "${tool.name}" — skipping`);
      continue;
    }
    toolMap.set(tool.name, tool);
    jsonSchemaCache.set(
      tool.name,
      toJsonSchemaCompat(tool.zodSchema as any) as Record<string, unknown>,
    );
  }

  logger.info(`Registered ${toolMap.size} tools`, { toolCount: toolMap.size });

  // Read once at construction: the value cannot change for a running process,
  // and warning here means it appears in startup output rather than buried in a
  // per-request log.
  const assumed = assumedCapabilitiesFromEnv();
  if (assumed.capabilities.length > 0) {
    logger.warn(
      `${ASSUME_CAPABILITIES_ENV_VAR} is forcing client capabilities on. This is a local ` +
        'debugging aid and must not be set in production.',
      { assumed: assumed.capabilities },
    );
  }
  if (assumed.unknown.length > 0) {
    logger.warn(`${ASSUME_CAPABILITIES_ENV_VAR} contains unrecognized entries, which are ignored`, {
      unknown: assumed.unknown,
    });
  }

  const server = new Server(
    { name: options.name, version: options.version },
    {
      capabilities: { tools: {} },
      ...(options.instructions ? { instructions: options.instructions } : {}),
    },
  );

  /**
   * Capabilities are fixed for a connection's lifetime, so derive once and reuse.
   * `runMcpHttp` builds a fresh Server per session and stdio has exactly one, so
   * caching on this closure stays correct per client.
   */
  let cachedClient: ClientCapabilityReport | undefined;
  const currentClient = (): ClientCapabilityReport => {
    if (!cachedClient) {
      const clientInfo = server.getClientVersion();
      if (!clientInfo && !server.getClientCapabilities()) {
        // Pre-handshake: do not cache, a real report is coming.
        return EMPTY_CAPABILITY_REPORT;
      }
      cachedClient = deriveClientCapabilities({
        capabilities: server.getClientCapabilities(),
        clientInfo,
        callerHeader: getRequestMcpCaller(),
        assumeCapabilities: assumed.capabilities,
      });
    }
    return cachedClient;
  };

  server.oninitialized = () => {
    const client = currentClient();
    logger.info('MCP client connected', {
      host: client.host,
      clientName: client.clientInfo?.name,
      clientVersion: client.clientInfo?.version,
      capabilities: describeCapabilities(client),
    });
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const client = currentClient();
    logger.debug('Listing MCP tools', { host: client.host });

    const toolList = await mcpSessionContext.run({ client, server }, async () =>
      Array.from(toolMap.entries()).map(([name, t]) => ({
        name: t.name,
        description: t.description,
        inputSchema: jsonSchemaCache.get(name) || { type: 'object', properties: {} },
        annotations: t.annotations,
        ...(t.requireSombra === true ? { _meta: { requireSombra: true } } : {}),
      })),
    );

    logger.info(`Returning ${toolList.length} tools`);
    return { tools: toolList };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const client = currentClient();
    logger.info(`Executing tool: ${name}`, { args: Object.keys(args || {}), host: client.host });

    try {
      const tool = toolMap.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const parseResult = tool.zodSchema.safeParse(args || {});
      if (!parseResult.success) {
        const issues = parseResult.error.issues
          .map(
            (i: { path: PropertyKey[]; message: string }) =>
              `${i.path.join('.') || 'input'}: ${i.message}`,
          )
          .join('; ');
        const errorResult = createToolResult(false, undefined, `Invalid input: ${issues}`, {
          code: 'VALIDATION_ERROR',
          retryable: false,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }],
          isError: true,
        };
      }

      const toolRequiresAuth = tool.requireAuth !== false;
      let oauthCredentials: ReturnType<typeof getLazyOAuthCredentials> = null;
      if (toolRequiresAuth) {
        await ensureLazyOAuthAuth(logger);
        oauthCredentials = getLazyOAuthCredentials();
      }

      const result = await mcpSessionContext.run({ client, server }, () =>
        toolCallContext.run({ toolName: name, correlationId: randomUUID() }, () => {
          const execute = () => tool.handler(parseResult.data);
          if (toolRequiresAuth && !getRequestAuth() && oauthCredentials) {
            return requestAuthContext.run(oauthCredentials, execute);
          }
          return execute();
        }),
      );
      logger.debug(`Tool ${name} completed successfully`);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      logger.error(`Error executing tool ${name}:`, error);
      return {
        content: [{ type: 'text', text: JSON.stringify(createErrorResult(error), null, 2) }],
        isError: true,
      };
    }
  });

  return server;
}

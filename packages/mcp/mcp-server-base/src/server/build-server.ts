import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getRequestAuth, requestAuthContext } from '../auth-context.js';
import { SimpleLogger } from '../clients/graphql/base.js';
import { ensureLazyOAuthAuth, getLazyOAuthCredentials } from '../oauth/lazy-auth.js';
import { toolCallContext } from '../tool-call-context.js';
import { createErrorResult, createToolResult } from '../tools/helpers.js';
import type { ResourceDefinition, ToolDefinition } from '../tools/types.js';
import { normalizeUiToolMeta } from './ui-meta.js';

export interface BuildMcpServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Pre-constructed tool definitions */
  tools: ToolDefinition[];
  /** Optional MCP resources (e.g. MCP App HTML views) */
  resources?: ResourceDefinition[];
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
  const resourceMap = new Map<string, ResourceDefinition>();

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

  for (const resource of options.resources ?? []) {
    if (resourceMap.has(resource.uri)) {
      logger.warn(`Duplicate resource URI "${resource.uri}" — skipping`);
      continue;
    }
    resourceMap.set(resource.uri, resource);
  }

  logger.info(`Registered ${toolMap.size} tools`, { toolCount: toolMap.size });
  if (resourceMap.size > 0) {
    logger.info(`Registered ${resourceMap.size} resources`, { resourceCount: resourceMap.size });
  }

  const server = new Server(
    { name: options.name, version: options.version },
    {
      capabilities: {
        tools: {},
        ...(resourceMap.size > 0 ? { resources: {} } : {}),
      },
      ...(options.instructions ? { instructions: options.instructions } : {}),
    },
  );

  // Log whether the connected client (e.g. Cursor) declared elicitation support.
  // Client capabilities are only available after the initialize handshake completes.
  server.oninitialized = () => {
    const clientCapabilities = server.getClientCapabilities();
    const elicitation = clientCapabilities?.elicitation;
    const supported = elicitation !== undefined;
    logger.info('=========Elicitation support==========', {
      supported,
      elicitation: elicitation ?? null,
      client: server.getClientVersion() ?? null,
    });
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing MCP tools');
    const toolList = Array.from(toolMap.entries()).map(([name, t]) => {
      const entry: Record<string, unknown> = {
        name: t.name,
        description: t.description,
        inputSchema: jsonSchemaCache.get(name) || { type: 'object', properties: {} },
        annotations: t.annotations,
      };
      const meta = normalizeUiToolMeta(t._meta as Record<string, unknown> | undefined);
      if (meta) {
        entry._meta = meta;
      }
      return entry;
    });
    logger.info(`Returning ${toolList.length} tools`);
    return { tools: toolList };
  });

  if (resourceMap.size > 0) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Listing MCP resources');
      const resources = Array.from(resourceMap.values()).map((r) => ({
        uri: r.uri,
        name: r.name,
        ...(r.description ? { description: r.description } : {}),
        mimeType: r.mimeType,
      }));
      return { resources };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      logger.info(`Reading MCP resource: ${uri}`);
      const resource = resourceMap.get(uri);
      if (!resource) {
        throw new Error(`Unknown resource: ${uri}`);
      }
      const body = await resource.read();
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: body.text,
            ...(body._meta ? { _meta: body._meta } : {}),
          },
        ],
      };
    });
  }

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Executing tool: ${name}`, { args: Object.keys(args || {}) });

    try {
      const tool = toolMap.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const parseResult = tool.zodSchema.safeParse(args || {});
      if (!parseResult.success) {
        const issues = parseResult.error.issues
          .map((i: any) => `${i.path.join('.') || 'input'}: ${i.message}`)
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

      const result = await toolCallContext.run(
        { toolName: name, correlationId: randomUUID() },
        () => {
          const execute = () => tool.handler(parseResult.data);
          if (toolRequiresAuth && !getRequestAuth() && oauthCredentials) {
            return requestAuthContext.run(oauthCredentials, execute);
          }
          return execute();
        },
      );
      logger.debug(`Tool ${name} completed successfully`);

      const response: {
        content: Array<{ type: 'text'; text: string }>;
        _meta?: Record<string, unknown>;
      } = {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
      const meta = normalizeUiToolMeta(tool._meta as Record<string, unknown> | undefined);
      if (meta) {
        response._meta = meta;
      }
      return response;
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

import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SimpleLogger } from '../clients/graphql/base.js';
import { toolCallContext } from '../tool-call-context.js';
import { createErrorResult, createToolResult } from '../tools/helpers.js';
import type { McpAppResource, ToolDefinition } from '../tools/types.js';
import { MCP_APP_RESOURCE_MIME_TYPE } from './mcp-app-mime.js';

function buildToolListMeta(tool: ToolDefinition): Record<string, unknown> | undefined {
  const ui: Record<string, unknown> = {};
  if (tool.ui?.resourceUri) {
    ui.resourceUri = tool.ui.resourceUri;
  }
  if (tool.internal) {
    ui.visibility = ['app'];
  }
  if (Object.keys(ui).length === 0) {
    return undefined;
  }
  return { ui };
}

export interface BuildMcpServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Pre-constructed tool definitions */
  tools: ToolDefinition[];
  /** MCP App UI resources (optional) */
  resources?: McpAppResource[];
}

function formatToolCallResult(result: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
} {
  if (
    result &&
    typeof result === 'object' &&
    'structuredContent' in result &&
    (result as { structuredContent?: unknown }).structuredContent !== undefined
  ) {
    const { structuredContent, ...rest } = result as {
      structuredContent: Record<string, unknown>;
      [key: string]: unknown;
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(rest, null, 2) }],
      structuredContent,
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
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
  const resourceMap = new Map<string, McpAppResource>();

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
      logger.warn(`Duplicate MCP App resource URI "${resource.uri}" — skipping`);
      continue;
    }
    resourceMap.set(resource.uri, resource);
  }

  logger.info(`Registered ${toolMap.size} tools`, {
    toolCount: toolMap.size,
    resourceCount: resourceMap.size,
  });

  const server = new Server(
    { name: options.name, version: options.version },
    {
      capabilities: {
        tools: {},
        ...(resourceMap.size > 0 ? { resources: {} } : {}),
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing MCP tools');
    const toolList = Array.from(toolMap.entries()).map(([name, t]) => {
      const meta = buildToolListMeta(t);
      return {
        name: t.name,
        description: t.description,
        inputSchema: jsonSchemaCache.get(name) || { type: 'object', properties: {} },
        annotations: t.annotations,
        ...(meta ? { _meta: meta } : {}),
      };
    });
    logger.info(`Returning ${toolList.length} tools`);
    return { tools: toolList };
  });

  if (resourceMap.size > 0) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Listing MCP App resources');
      return {
        resources: Array.from(resourceMap.values()).map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: MCP_APP_RESOURCE_MIME_TYPE,
        })),
      };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      logger.debug(`Reading MCP App resource: ${uri}`);
      const resource = resourceMap.get(uri);
      if (!resource) {
        throw new Error(`Unknown resource: ${uri}`);
      }
      const html = await resource.loadHtml();
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: MCP_APP_RESOURCE_MIME_TYPE,
            text: html,
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

      const result = await toolCallContext.run(
        { toolName: name, correlationId: randomUUID() },
        () => tool.handler(parseResult.data),
      );
      logger.debug(`Tool ${name} completed successfully`);

      return formatToolCallResult(result);
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

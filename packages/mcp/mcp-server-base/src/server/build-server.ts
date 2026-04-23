import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { SimpleLogger } from '../clients/graphql/base.js';
import { createErrorResult, createToolResult } from '../tools/helpers.js';
import type { ToolDefinition } from '../tools/types.js';

export interface BuildMcpServerOptions {
  /** Server display name */
  name: string;
  /** Server version */
  version: string;
  /** Pre-constructed tool definitions */
  tools: ToolDefinition[];
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

  const server = new Server(
    { name: options.name, version: options.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing MCP tools');
    const toolList = Array.from(toolMap.entries()).map(([name, t]) => ({
      name: t.name,
      description: t.description,
      inputSchema: jsonSchemaCache.get(name) || { type: 'object', properties: {} },
      annotations: t.annotations,
    }));
    logger.info(`Returning ${toolList.length} tools`);
    return { tools: toolList };
  });

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

      const result = await tool.handler(parseResult.data);
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

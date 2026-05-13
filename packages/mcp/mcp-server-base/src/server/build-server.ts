import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { SimpleLogger } from '../clients/graphql/base.js';
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
}

/**
 * Creates an MCP {@link Server} with ListTools and CallTool handlers registered
 * from the given tool definitions. Does not connect any transport — the caller
 * is responsible for creating a transport and calling `server.connect(transport)`.
 */
export function buildMcpServer(options: BuildMcpServerOptions): Server {
  const logger = new SimpleLogger();
  const toolMap = new Map<string, ToolDefinition>();
  const inputJsonSchemaCache = new Map<string, Record<string, unknown>>();
  const outputJsonSchemaCache = new Map<string, Record<string, unknown>>();

  for (const tool of options.tools) {
    if (toolMap.has(tool.name)) {
      logger.warn(`Duplicate tool name "${tool.name}" — skipping`);
      continue;
    }
    toolMap.set(tool.name, tool);
    inputJsonSchemaCache.set(
      tool.name,
      toJsonSchemaCompat(tool.zodSchema as any) as Record<string, unknown>,
    );
    outputJsonSchemaCache.set(
      tool.name,
      toJsonSchemaCompat(tool.outputZodSchema as any) as Record<string, unknown>,
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
      inputSchema: inputJsonSchemaCache.get(name) || { type: 'object', properties: {} },
      outputSchema: outputJsonSchemaCache.get(name),
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
          structuredContent: errorResult as Record<string, unknown>,
          isError: true,
        };
      }

      const result = await toolCallContext.run(
        { toolName: name, correlationId: randomUUID() },
        () => tool.handler(parseResult.data),
      );
      logger.debug(`Tool ${name} completed successfully`);

      // Validate handler return against the declared outputZodSchema. Failures
      // are non-fatal during rollout: log to stderr but still surface the raw
      // handler return as `structuredContent` so consumers don't break on
      // schema drift.
      const outputParse = tool.outputZodSchema.safeParse(result);
      if (!outputParse.success) {
        const issues = outputParse.error.issues
          .map((i: any) => `${i.path.join('.') || 'output'}: ${i.message}`)
          .join('; ');
        process.stderr.write(
          `Warning: outputZodSchema validation failed for "${name}": ${issues}\n`,
        );
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: (outputParse.success ? outputParse.data : result) as Record<
          string,
          unknown
        >,
      };
    } catch (error) {
      logger.error(`Error executing tool ${name}:`, error);
      const errorResult = createErrorResult(error);
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }],
        structuredContent: errorResult as Record<string, unknown>,
        isError: true,
      };
    }
  });

  return server;
}

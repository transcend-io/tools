import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import { ClassifyTextSchema } from '../schemas.js';

export function createDiscoveryClassifyTextTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'discovery_classify_text',
    description:
      "Classify text content using Transcend's LLM classifier to identify data categories",
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        texts: {
          type: 'array',
          description: 'Array of text strings to classify',
          items: { type: 'string' },
        },
        categories: {
          type: 'array',
          description: 'Specific categories to classify against (optional)',
          items: { type: 'string' },
        },
        model: {
          type: 'string',
          description: 'LLM model to use for classification (optional)',
        },
      },
      required: ['texts'],
    },
    handler: async (args) => {
      const parsed = validateArgs(ClassifyTextSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const results = await rest.classifyText({
          texts: parsed.data.texts,
          categories: parsed.data.categories,
          model: parsed.data.model,
        });

        return createToolResult(true, {
          results,
          inputCount: parsed.data.texts.length,
          message: `Classified ${parsed.data.texts.length} text(s) successfully`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}

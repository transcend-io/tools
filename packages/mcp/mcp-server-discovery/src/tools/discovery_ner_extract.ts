import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import { NerExtractSchema } from '../schemas.js';

export function createDiscoveryNerExtractTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'discovery_ner_extract',
    description: 'Extract named entities (PII, organizations, locations, etc.) from text using NER',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to extract entities from',
        },
        entity_types: {
          type: 'array',
          description: 'Specific entity types to extract (optional)',
          items: { type: 'string' },
        },
      },
      required: ['text'],
    },
    handler: async (args) => {
      const parsed = validateArgs(NerExtractSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await rest.extractEntities({
          text: parsed.data.text,
          entityTypes: parsed.data.entity_types,
        });

        return createToolResult(true, {
          entities: result.entities,
          entityCount: result.entities.length,
          entityTypes: [...new Set(result.entities.map((e) => e.type))],
          message: `Extracted ${result.entities.length} entities from text`,
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

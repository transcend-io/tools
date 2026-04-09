import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

const NerExtractSchema = z.object({
  text: z.string(),
  entity_types: z.array(z.string()).optional(),
});

export function createDiscoveryNerExtractTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'discovery_ner_extract',
    description: 'Extract named entities (PII, organizations, locations, etc.) from text using NER',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: NerExtractSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof NerExtractSchema>;
      try {
        const result = await rest.extractEntities({
          text: args.text,
          entityTypes: args.entity_types,
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

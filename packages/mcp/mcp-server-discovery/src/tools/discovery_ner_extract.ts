import {
  createToolResult,
  defineTool,
  envelopeSchema,
  NEREntitySchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

export const NerExtractSchema = z.object({
  text: z.string().describe('Text to extract entities from'),
  entity_types: z
    .array(z.string())
    .optional()
    .describe('Specific entity types to extract (optional)'),
});
export type NerExtractInput = z.infer<typeof NerExtractSchema>;

export function createDiscoveryNerExtractTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'discovery_ner_extract',
    description: 'Extract named entities (PII, organizations, locations, etc.) from text using NER',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: NerExtractSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        entities: z.array(NEREntitySchema),
        entityCount: z.number(),
        entityTypes: z.array(z.string()),
        message: z.string(),
      }),
    ),
    handler: async ({ text, entity_types }) => {
      const result = await rest.extractEntities({
        text,
        entityTypes: entity_types,
      });

      return createToolResult(true, {
        entities: result.entities,
        entityCount: result.entities.length,
        entityTypes: [...new Set(result.entities.map((e) => e.type))],
        message: `Extracted ${result.entities.length} entities from text`,
      });
    },
  });
}

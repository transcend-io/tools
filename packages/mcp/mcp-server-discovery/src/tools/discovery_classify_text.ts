import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

export const ClassifyTextSchema = z.object({
  texts: z.array(z.string()).describe('Array of text strings to classify'),
  categories: z
    .array(z.string())
    .min(1)
    .describe(
      'Category labels to classify against (required). Common PII labels include EMAIL, PHONE, NAME, IP_ADDRESS, LOCATION, and NOT_PERSONAL_DATA.',
    ),
  model: z.string().optional().describe('LLM model type override (sent as model_type)'),
});
export type ClassifyTextInput = z.infer<typeof ClassifyTextSchema>;

export function createDiscoveryClassifyTextTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'discovery_classify_text',
    description:
      "Classify text content using Transcend's LLM classifier to identify data categories. Requires at least one category label.",
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: ClassifyTextSchema,
    handler: async ({ texts, categories, model }) => {
      const results = await rest.classifyText({
        texts,
        categories,
        model,
      });

      return createToolResult(true, {
        results,
        inputCount: texts.length,
        message: `Classified ${texts.length} text(s) successfully`,
      });
    },
  });
}

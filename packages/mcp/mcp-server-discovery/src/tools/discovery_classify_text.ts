import {
  createToolResult,
  defineTool,
  envelopeSchema,
  LLMClassificationResultSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

export const ClassifyTextSchema = z.object({
  texts: z.array(z.string()).describe('Array of text strings to classify'),
  categories: z
    .array(z.string())
    .optional()
    .describe('Specific categories to classify against (optional)'),
  model: z.string().optional().describe('LLM model to use for classification (optional)'),
});
export type ClassifyTextInput = z.infer<typeof ClassifyTextSchema>;

export function createDiscoveryClassifyTextTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'discovery_classify_text',
    description:
      "Classify text content using Transcend's LLM classifier to identify data categories",
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ClassifyTextSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        results: z.array(LLMClassificationResultSchema),
        inputCount: z.number(),
        message: z.string(),
      }),
    ),
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

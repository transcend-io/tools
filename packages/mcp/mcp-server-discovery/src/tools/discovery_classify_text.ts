import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

const ClassifyTextSchema = z.object({
  texts: z.array(z.string()).describe('Array of text strings to classify'),
  categories: z
    .array(z.string())
    .optional()
    .describe('Specific categories to classify against (optional)'),
  model: z.string().optional().describe('LLM model to use for classification (optional)'),
});

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
    handler: async ({ texts, categories, model }) => {
      try {
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
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}

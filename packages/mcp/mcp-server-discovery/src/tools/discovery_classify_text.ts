import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

const ClassifyTextSchema = z.object({
  texts: z.array(z.string()),
  categories: z.array(z.string()).optional(),
  model: z.string().optional(),
});

export function createDiscoveryClassifyTextTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'discovery_classify_text',
    description:
      "Classify text content using Transcend's LLM classifier to identify data categories",
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ClassifyTextSchema,
    handler: async (rawArgs) => {
      const args = rawArgs as z.infer<typeof ClassifyTextSchema>;
      try {
        const results = await rest.classifyText({
          texts: args.texts,
          categories: args.categories,
          model: args.model,
        });

        return createToolResult(true, {
          results,
          inputCount: args.texts.length,
          message: `Classified ${args.texts.length} text(s) successfully`,
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

import {
  createToolResult,
  defineTool,
  envelopeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { IdentifierSchema } from './preferences_query.js';

export const DeletePreferencesSchema = z.object({
  partition: z.string().describe('Partition/organization context'),
  identifiers: z.array(IdentifierSchema).describe('Array of identifier objects to delete'),
});
export type DeletePreferencesInput = z.infer<typeof DeletePreferencesSchema>;

export function createPreferencesDeleteTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_delete',
    description: 'Delete consent preferences for specified users',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Deletes preference data for the identifiers',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: DeletePreferencesSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        success: z.boolean().optional(),
        count: z.number().optional(),
        message: z.string(),
      }),
    ),
    handler: async ({ partition, identifiers }) => {
      const result = await rest.deletePreferences(
        partition,
        identifiers.map((id) => ({
          value: id.value,
          type: id.type,
        })),
      );

      return createToolResult(true, {
        ...result,
        message: `Successfully deleted ${result.count} preference records`,
      });
    },
  });
}

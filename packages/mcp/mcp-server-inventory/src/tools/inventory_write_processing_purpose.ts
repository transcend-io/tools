import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { DefaultPurposeSubCategoryType, ProcessingPurpose } from '@transcend-io/privacy-types';

import type { InventoryMixin } from '../graphql.js';

export const WriteProcessingPurposeSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Existing processing purpose subcategory ID. When set, updates that row directly.'),
    name: z
      .string()
      .optional()
      .describe(
        `Subcategory display name (e.g. "${DefaultPurposeSubCategoryType.Other}", "Login"). ` +
          'Upsert key with purpose when id is omitted.',
      ),
    purpose: z
      .nativeEnum(ProcessingPurpose)
      .optional()
      .describe(
        'Processing purpose enum (e.g. ESSENTIAL, ANALYTICS). Upsert key with name when id is omitted.',
      ),
    description: z.string().optional().describe('Description of this processing purpose'),
  })
  .refine((data) => Boolean(data.id || (data.name && data.purpose)), {
    message: 'Provide id to update, or both name and purpose to upsert',
  });
export type WriteProcessingPurposeInput = z.infer<typeof WriteProcessingPurposeSchema>;

export function createInventoryWriteProcessingPurposeTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_write_processing_purpose',
    description:
      'Create or update a processing purpose subcategory in the Processing Purposes table. ' +
      'Pass `id` to update by ID, or `name` + `purpose` to upsert (creates when missing). ' +
      'The unique key is name + purpose (e.g. "Other:ESSENTIAL").',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Creates or updates a processing purpose subcategory',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteProcessingPurposeSchema,
    handler: async (input) => {
      const { processingPurpose, created } = await graphql.writeProcessingPurpose({
        id: input.id,
        name: input.name,
        purpose: input.purpose,
        description: input.description,
      });
      return createToolResult(true, {
        processingPurpose,
        created,
        message: created
          ? 'Processing purpose created successfully'
          : 'Processing purpose updated successfully',
      });
    },
  });
}

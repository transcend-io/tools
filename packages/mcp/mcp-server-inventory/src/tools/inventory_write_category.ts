import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { DataCategoryType, DefaultPurposeSubCategoryType } from '@transcend-io/privacy-types';

import type { InventoryMixin } from '../graphql.js';

export const WriteCategorySchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe('Existing data subcategory ID. When set, updates that row directly.'),
    name: z
      .string()
      .optional()
      .describe(
        `Subcategory display name (e.g. "${DefaultPurposeSubCategoryType.Other}", "Email"). ` +
          'Upsert key with category when id is omitted.',
      ),
    category: z
      .nativeEnum(DataCategoryType)
      .optional()
      .describe('Data category type (e.g. CONTACT, ID). Upsert key with name when id is omitted.'),
    description: z.string().optional().describe('Description of this data subcategory'),
    ownerEmails: z.array(z.string()).optional().describe('Owner email addresses'),
    teamNames: z.array(z.string()).optional().describe('Owner team names'),
  })
  .refine((data) => Boolean(data.id || (data.name && data.category)), {
    message: 'Provide id to update, or both name and category to upsert',
  });
export type WriteCategoryInput = z.infer<typeof WriteCategorySchema>;

export function createInventoryWriteCategoryTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_write_category',
    description:
      'Create or update a data subcategory in the Data Categories table. ' +
      'Pass `id` to update by ID (name and category cannot change on update), or `name` + `category` ' +
      'to upsert (creates when missing). The unique key is name + category (e.g. "Email:CONTACT"). ' +
      'Use returned IDs when assigning categories via inventory_update_or_create_data_point.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteCategorySchema,
    handler: async (input) => {
      const { category, created } = await graphql.writeDataCategory({
        id: input.id,
        name: input.name,
        category: input.category,
        description: input.description,
        ownerEmails: input.ownerEmails,
        teamNames: input.teamNames,
      });
      return createToolResult(true, {
        category,
        created,
        message: created
          ? 'Data category created successfully'
          : 'Data category updated successfully',
      });
    },
  });
}

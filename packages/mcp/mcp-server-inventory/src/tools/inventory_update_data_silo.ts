import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const UpdateDataSiloSchema = z.object({
  dataSiloId: z.string().describe('ID of the data silo to update'),
  title: z.string().optional().describe('New title for the data silo'),
  description: z.string().optional().describe('New description'),
  ownerEmails: z.array(z.string()).optional().describe('Owner email addresses'),
  teamNames: z.array(z.string()).optional().describe('Team names'),
  vendorId: z.string().optional().describe('Linked vendor ID from the Vendors table'),
  processingPurposeSubCategoryIds: z
    .array(z.string())
    .optional()
    .describe('Silo-level purpose of processing IDs from inventory_list_processing_purposes'),
  dataSubjectBlockListIds: z
    .array(z.string())
    .optional()
    .describe(
      'Data subject IDs to block on this system (not an allowlist). Resolve via inventory_list_data_subjects.',
    ),
  country: z.string().optional().describe('ISO country code'),
  countrySubDivision: z.string().optional().describe('ISO country subdivision'),
  websiteUrl: z.string().optional().describe('Website URL'),
  contactName: z.string().optional().describe('Primary contact name'),
  contactEmail: z.string().optional().describe('Primary contact email'),
  notes: z.string().optional().describe('Free-form notes'),
  businessEntityTitles: z
    .array(z.string())
    .optional()
    .describe('Business entity titles from inventory_list_business_entities'),
  isLive: z.boolean().optional().describe('Whether the data silo is live for DSR processing'),
});
export type UpdateDataSiloInput = z.infer<typeof UpdateDataSiloSchema>;

export function createInventoryUpdateDataSiloTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_update_data_silo',
    description:
      'Legacy alias for updating a data silo by ID. Prefer inventory_write_data_silo with `dataSiloId`.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    // Hidden from tools/list so agents use inventory_write_data_silo; still callable.
    visibility: [],
    zodSchema: UpdateDataSiloSchema,
    handler: async ({ dataSiloId, ...fields }) => {
      const result = await graphql.updateDataSilo({
        id: dataSiloId,
        ...fields,
      });
      return createToolResult(true, {
        dataSilo: result,
        message: 'Data silo updated successfully',
      });
    },
  });
}

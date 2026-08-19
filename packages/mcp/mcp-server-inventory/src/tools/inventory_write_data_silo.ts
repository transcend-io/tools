import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

const DataSiloMetadataSchema = {
  title: z.string().optional().describe('Display title for the data silo'),
  description: z.string().optional().describe('Description for the data silo'),
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
};

export const WriteDataSiloSchema = z
  .object({
    dataSiloId: z
      .string()
      .optional()
      .describe('Existing data silo ID. When set, updates that data system directly.'),
    integrationName: z
      .string()
      .optional()
      .describe(
        'Catalog integration name (GraphQL `name`), e.g. "server", "salesforce". Required when ' +
          'creating (dataSiloId omitted). Call inventory_list_catalog_integrations to search.',
      ),
    ...DataSiloMetadataSchema,
  })
  .refine((data) => Boolean(data.dataSiloId || data.integrationName), {
    message: 'Provide dataSiloId to update, or integrationName to create',
  });
export type WriteDataSiloInput = z.infer<typeof WriteDataSiloSchema>;

export function createInventoryWriteDataSiloTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_write_data_silo',
    description:
      'Create or update a data silo (Data Systems table). Pass `dataSiloId` to update by ID, or ' +
      '`integrationName` to create a new data system (always creates — never upserts by title). ' +
      'When creating, optional metadata fields (owners, vendor, purposes, subjects, etc.) are applied ' +
      'after create in one call. Create-then-patch is not atomic: if the metadata update fails, the ' +
      'error includes `details.dataSiloId` — retry with `dataSiloId`, do not create again. ' +
      'Prefer this over inventory_create_data_silo + inventory_update_data_silo.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: WriteDataSiloSchema,
    handler: async ({ dataSiloId, integrationName, ...fields }) => {
      const { dataSilo, created } = await graphql.writeDataSilo({
        id: dataSiloId,
        integrationName,
        ...fields,
      });
      return createToolResult(true, {
        dataSilo,
        created,
        message: created
          ? `Data silo "${dataSilo.title}" created successfully`
          : 'Data silo updated successfully',
      });
    },
  });
}

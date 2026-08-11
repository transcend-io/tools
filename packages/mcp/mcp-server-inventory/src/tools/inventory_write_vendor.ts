import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export const WriteVendorSchema = z
  .object({
    vendorId: z
      .string()
      .optional()
      .describe('Existing vendor ID. When set, updates that vendor directly.'),
    title: z
      .string()
      .optional()
      .describe(
        'Vendor display title. Upsert key when vendorId is omitted; required to create a new vendor.',
      ),
    description: z
      .string()
      .optional()
      .describe('Vendor description (defaults to empty string on create)'),
    dataProcessingAgreementLink: z
      .string()
      .optional()
      .describe('URL to the data processing agreement'),
    contactName: z.string().optional().describe('Primary contact name'),
    contactEmail: z.string().optional().describe('Primary contact email'),
    contactPhone: z.string().optional().describe('Primary contact phone'),
    websiteUrl: z.string().optional().describe('Vendor website URL'),
    address: z.string().optional().describe('Physical address'),
    headquarterCountry: z.string().optional().describe('Headquarters ISO country code'),
    headquarterSubDivision: z.string().optional().describe('Headquarters country subdivision'),
  })
  .refine((data) => Boolean(data.vendorId || data.title), {
    message: 'Provide vendorId to update, or title to upsert by title',
  });
export type WriteVendorInput = z.infer<typeof WriteVendorSchema>;

export function createInventoryWriteVendorTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_write_vendor',
    description:
      'Create or update a vendor in the Vendors table. Pass `vendorId` to update by ID, or `title` ' +
      'to upsert by title (creates when missing). Mirrors CLI inventory vendor sync.',
    category: 'Data Inventory',
    readOnly: false,
    confirmationHint: 'Creates or updates a vendor in the inventory',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteVendorSchema,
    handler: async (input) => {
      const { vendor, created } = await graphql.writeVendor({
        id: input.vendorId,
        title: input.title,
        description: input.description,
        dataProcessingAgreementLink: input.dataProcessingAgreementLink,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        websiteUrl: input.websiteUrl,
        address: input.address,
        headquarterCountry: input.headquarterCountry,
        headquarterSubDivision: input.headquarterSubDivision,
      });
      return createToolResult(true, {
        vendor,
        created,
        message: created ? 'Vendor created successfully' : 'Vendor updated successfully',
      });
    },
  });
}

import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { BusinessEntityInput } from '@transcend-io/sdk';

import { decodeYmlItems, pushYmlSection, ymlItemsSchema } from '../helpers/ymlSection.js';

export const WriteBusinessEntitiesSchema = z.object({
  items: ymlItemsSchema(
    'Business entities to create or update, matched by `title`. Other fields: description, ' +
      'address, headquarterCountry, dataProtectionOfficerName, owners, teams.',
  ),
});
export type WriteBusinessEntitiesInput = z.infer<typeof WriteBusinessEntitiesSchema>;

export function createInventoryWriteBusinessEntitiesTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_write_business_entities',
    description:
      'Create or update business entities in bulk, matched by title. Same as the ' +
      '`business-entities` section of `transcend inventory push`. Returns success, count, and ' +
      'per-item errors. Use inventory_list_business_entities to read them.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteBusinessEntitiesSchema,
    handler: async ({ items }) => {
      const decoded = decodeYmlItems(BusinessEntityInput, items);
      return pushYmlSection(clients, { 'business-entities': decoded }, decoded.length);
    },
  });
}

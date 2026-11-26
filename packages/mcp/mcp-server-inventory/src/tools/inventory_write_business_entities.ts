import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { BusinessEntityInput, type BusinessEntityInput as BusinessEntity } from '@transcend-io/sdk';

export const WriteBusinessEntitiesSchema = z.object({
  businessEntities: ymlItemsSchema(
    'Business entities to create or update, matched by `title`. Other fields: description, ' +
      'address, headquarterCountry, dataProtectionOfficerName, owners, teams.',
    { codec: BusinessEntityInput },
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
    handler: async ({ businessEntities }) => {
      const decoded = decodeYmlItems<BusinessEntity>(
        BusinessEntityInput,
        businessEntities,
        'business-entities',
      );
      return pushYmlSection(clients, { 'business-entities': decoded }, decoded.length);
    },
  });
}

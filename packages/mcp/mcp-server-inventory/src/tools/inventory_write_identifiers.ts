import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { IdentifierInput } from '@transcend-io/sdk/transcend-yml';

import { decodeYmlItems, pushYmlSection, ymlItemsSchema } from '../helpers/ymlSection.js';

export const WriteIdentifiersSchema = z.object({
  items: ymlItemsSchema(
    'Identifiers to create or update, matched by `name`. Required: name, type. Other fields: ' +
      'regex, selectOptions, dataSubjects, isRequiredInForm, displayTitle.',
  ),
});
export type WriteIdentifiersInput = z.infer<typeof WriteIdentifiersSchema>;

export function createInventoryWriteIdentifiersTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_write_identifiers',
    description:
      'Create or update request identifiers in bulk, matched by name. Missing identifiers are ' +
      'created first. Same as the `identifiers` section of `transcend inventory push`. Returns ' +
      'success, count, and per-item errors. Use inventory_list_identifiers to read them.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteIdentifiersSchema,
    handler: async ({ items }) => {
      const decoded = decodeYmlItems(IdentifierInput, items);
      return pushYmlSection(clients, { identifiers: decoded }, decoded.length);
    },
  });
}

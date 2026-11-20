import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { IdentifierInput, type IdentifierInput as Identifier } from '@transcend-io/sdk';

export const WriteIdentifiersSchema = z.object({
  identifiers: ymlItemsSchema(
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
    handler: async ({ identifiers }) => {
      const decoded = decodeYmlItems<Identifier>(IdentifierInput, identifiers, 'identifiers', {
        uniqueBy: (item) => item.name,
      });
      return pushYmlSection(clients, { identifiers: decoded }, decoded.length);
    },
  });
}

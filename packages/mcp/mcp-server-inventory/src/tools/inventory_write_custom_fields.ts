import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { AttributeInput, type AttributeInput as Attribute } from '@transcend-io/sdk';

export const WriteCustomFieldsSchema = z.object({
  attributes: ymlItemsSchema(
    'Custom fields (attribute keys) to create or update, matched by `name`. Required: name, ' +
      'type. Other fields: description, resources, values.',
    { codec: AttributeInput },
  ),
});
export type WriteCustomFieldsInput = z.infer<typeof WriteCustomFieldsSchema>;

export function createInventoryWriteCustomFieldsTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_write_custom_fields',
    description:
      'Create or update custom fields (attribute keys and their values) in bulk, matched by ' +
      'name. Same as the `attributes` section of `transcend inventory push`. Existing values ' +
      'not listed are kept. Returns success, count, and per-item errors.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: WriteCustomFieldsSchema,
    handler: async ({ attributes }) => {
      const decoded = decodeYmlItems<Attribute>(AttributeInput, attributes, 'attributes', {
        uniqueBy: (item) => item.name,
      });
      return pushYmlSection(clients, { attributes: decoded }, decoded.length);
    },
  });
}

import { defineTool, EmptySchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

export const ListCustomFieldsSchema = EmptySchema;
export type ListCustomFieldsInput = Record<string, never>;

export function createInventoryListCustomFieldsTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_list_custom_fields',
    description:
      'List custom fields (attribute keys and their values) in `transcend.yml` shape. Same as ' +
      'the `attributes` section of `transcend inventory pull`. Returns the full set. Pass items ' +
      'back to inventory_write_custom_fields.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: ListCustomFieldsSchema,
    handler: async () => listAllYmlSection(clients, TranscendPullResource.Attributes),
  });
}

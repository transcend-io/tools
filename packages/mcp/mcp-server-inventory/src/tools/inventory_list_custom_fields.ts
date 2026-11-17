import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { TranscendPullResource } from '@transcend-io/sdk/transcend-yml';

import { pullYmlSection } from '../helpers/ymlSection.js';

export const ListCustomFieldsSchema = z.object({});
export type ListCustomFieldsInput = z.infer<typeof ListCustomFieldsSchema>;

export function createInventoryListCustomFieldsTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_list_custom_fields',
    description:
      'List custom fields (attribute keys and their values) in `transcend.yml` shape. Same as ' +
      'the `attributes` section of `transcend inventory pull`. Returns the full set. Pass items ' +
      'back to inventory_write_custom_fields.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListCustomFieldsSchema,
    handler: async () => {
      const items = await pullYmlSection(clients, TranscendPullResource.Attributes);
      return createListResult(items, { totalCount: items.length, hasNextPage: false });
    },
  });
}

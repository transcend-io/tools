import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { DataSubjectInput } from '@transcend-io/sdk/transcend-yml';

import { decodeYmlItems, pushYmlSection, ymlItemsSchema } from '../helpers/ymlSection.js';

export const WriteDataSubjectsSchema = z.object({
  items: ymlItemsSchema(
    'Data subject types to create or update, matched by `type`. Other fields: title, active, ' +
      'adminDashboardDefaultSilentMode, supportsAuthorizedAgent, actions.',
  ),
});
export type WriteDataSubjectsInput = z.infer<typeof WriteDataSubjectsSchema>;

export function createInventoryWriteDataSubjectsTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_write_data_subjects',
    description:
      'Create or update data subject types in bulk, matched by type. Same as the `data-subjects` ' +
      'section of `transcend inventory push`. Returns success, count, and per-item errors. Use ' +
      'inventory_list_data_subjects to read them.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteDataSubjectsSchema,
    handler: async ({ items }) => {
      const decoded = decodeYmlItems(DataSubjectInput, items);
      return pushYmlSection(clients, { 'data-subjects': decoded }, decoded.length);
    },
  });
}

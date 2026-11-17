import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { ProcessingActivityInput } from '@transcend-io/sdk/transcend-yml';

import { decodeYmlItems, pushYmlSection, ymlItemsSchema } from '../helpers/ymlSection.js';

export const WriteProcessingActivitiesSchema = z.object({
  items: ymlItemsSchema(
    'Processing activities to create or update, matched by `title`. Other fields: description, ' +
      'retentionType, dataSiloTitles, dataSubjectTypes, teamNames, ownerEmails, processingSubPurposes.',
  ),
});
export type WriteProcessingActivitiesInput = z.infer<typeof WriteProcessingActivitiesSchema>;

export function createInventoryWriteProcessingActivitiesTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_write_processing_activities',
    description:
      'Create or update processing activities in bulk, matched by title. Missing data subject ' +
      'types are created first. Same as the `processing-activities` section of `transcend ' +
      'inventory push`. Returns success, count, and per-item errors.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteProcessingActivitiesSchema,
    handler: async ({ items }) => {
      const decoded = decodeYmlItems(ProcessingActivityInput, items);
      return pushYmlSection(clients, { 'processing-activities': decoded }, decoded.length);
    },
  });
}

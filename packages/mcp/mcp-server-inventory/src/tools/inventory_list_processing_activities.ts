import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { TranscendPullResource } from '@transcend-io/sdk';

import { pullYmlSection } from '../helpers/ymlSection.js';

export const ListProcessingActivitiesSchema = z.object({});
export type ListProcessingActivitiesInput = z.infer<typeof ListProcessingActivitiesSchema>;

export function createInventoryListProcessingActivitiesTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_list_processing_activities',
    description:
      'List processing activities in `transcend.yml` shape (title, purposes, data subjects, ' +
      'regions, owners). Same as the `processing-activities` section of `transcend inventory ' +
      'pull`. Returns the full set. Pass items back to inventory_write_processing_activities.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListProcessingActivitiesSchema,
    handler: async () => {
      const items = await pullYmlSection(clients, TranscendPullResource.ProcessingActivities);
      return createListResult(items, { totalCount: items.length, hasNextPage: false });
    },
  });
}

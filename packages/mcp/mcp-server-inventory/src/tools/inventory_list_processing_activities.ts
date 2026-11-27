import { defineTool, EmptySchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

export const ListProcessingActivitiesSchema = EmptySchema;
export type ListProcessingActivitiesInput = Record<string, never>;

export function createInventoryListProcessingActivitiesTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_list_processing_activities',
    description:
      'List processing activities in `transcend.yml` shape (title, purposes, data subjects, ' +
      'regions, owners). Same as the `processing-activities` section of `transcend inventory ' +
      'pull`. Returns the full set. Pass items back to inventory_write_processing_activities.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: ListProcessingActivitiesSchema,
    handler: async () => listAllYmlSection(clients, TranscendPullResource.ProcessingActivities),
  });
}

import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import {
  ProcessingActivityInput,
  type ProcessingActivityInput as ProcessingActivity,
} from '@transcend-io/sdk';

export const WriteProcessingActivitiesSchema = z.object({
  processingActivities: ymlItemsSchema(
    'Processing activities to create or update, matched by `title`. Other fields: purposes, ' +
      'dataSubjectTypes, regions, owners.',
    { codec: ProcessingActivityInput },
  ),
});
export type WriteProcessingActivitiesInput = z.infer<typeof WriteProcessingActivitiesSchema>;

export function createInventoryWriteProcessingActivitiesTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_write_processing_activities',
    description:
      'Create or update processing activities in bulk, matched by title. Same as the ' +
      '`processing-activities` section of `transcend inventory push`. Returns success, count, and ' +
      'per-item errors.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteProcessingActivitiesSchema,
    handler: async ({ processingActivities }) => {
      const decoded = decodeYmlItems<ProcessingActivity>(
        ProcessingActivityInput,
        processingActivities,
        'processing-activities',
        { uniqueBy: (item) => item.title },
      );
      return pushYmlSection(clients, { 'processing-activities': decoded }, decoded.length);
    },
  });
}

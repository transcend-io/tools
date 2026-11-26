import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { DataSubjectInput, type DataSubjectInput as DataSubject } from '@transcend-io/sdk';

export const WriteDataSubjectsSchema = z.object({
  dataSubjects: ymlItemsSchema(
    'Data subject types to create or update, matched by `type`. Optional: active, title, ' +
      'description.',
    { codec: DataSubjectInput },
  ),
});
export type WriteDataSubjectsInput = z.infer<typeof WriteDataSubjectsSchema>;

export function createInventoryWriteDataSubjectsTool(clients: ToolClients) {
  return defineTool({
    name: 'inventory_write_data_subjects',
    description:
      'Create or update data subject types in bulk, matched by type. Same as the `data-subjects` ' +
      'section of `transcend inventory push`. Returns success, count, and per-item errors.',
    category: 'Data Inventory',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteDataSubjectsSchema,
    handler: async ({ dataSubjects }) => {
      const decoded = decodeYmlItems<DataSubject>(DataSubjectInput, dataSubjects, 'data-subjects', {
        uniqueBy: (item) => item.type,
      });
      return pushYmlSection(clients, { 'data-subjects': decoded }, decoded.length);
    },
  });
}

import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { PartitionInput } from '@transcend-io/sdk';

export const WritePartitionsSchema = z.object({
  partitions: ymlItemsSchema(
    'Partitions to create, matched by name. Existing names are left alone, and nothing is ' +
      'deleted. Same as the partitions section of transcend inventory push.',
    { codec: PartitionInput },
  ),
});
export type WritePartitionsInput = z.infer<typeof WritePartitionsSchema>;

export function createPreferencesWritePartitionsTool(clients: ToolClients) {
  return defineTool({
    name: 'preferences_write_partitions',
    description:
      'Create Preference Store partitions by name. Existing names are left alone, and nothing is ' +
      'deleted. Same as the partitions section of `transcend inventory push`. Returns ' +
      'success and any errors. Use preferences_list_partitions to read the current partitions.',
    category: 'Preference Management',
    readOnly: false,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: WritePartitionsSchema,
    handler: async ({ partitions }) => {
      const items = decodeYmlItems<PartitionInput>(PartitionInput, partitions, 'partitions', {
        uniqueBy: (item) => item.name,
      });
      return pushYmlSection(clients, { partitions: items }, items.length);
    },
  });
}

import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { syncPartitions } from '@transcend-io/sdk';
import { PartitionInput } from '@transcend-io/sdk/transcend-yml';

import { decodeItems, runSync } from '../helpers/syncRun.js';

export const WritePartitionsSchema = z.object({
  partitions: z
    .array(
      z.object({
        name: z.string().describe('Partition name. Created when no partition has this name.'),
      }),
    )
    .min(1)
    .max(100)
    .describe(
      'Partitions to create, keyed by name. Same shape as the transcend.yml partitions section.',
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
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WritePartitionsSchema,
    handler: async ({ partitions }) => {
      const items = decodeItems<PartitionInput>(PartitionInput, partitions, 'partitions');
      const client = createGraphqlRequestClient(clients.graphql);
      return runSync(items.length, (logger) => syncPartitions(client, items, { logger }));
    },
  });
}

import {
  createGraphqlRequestClient,
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { fetchAllActionItemCollections } from '@transcend-io/sdk';

export const ListActionItemCollectionsSchema = OffsetPaginationSchema;
export type ListActionItemCollectionsInput = z.infer<typeof ListActionItemCollectionsSchema>;

export function createWorkflowsListActionItemCollectionsTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_list_action_item_collections',
    description:
      'List action item collections (the groups action items belong to) with title, ' +
      'description, product line, and hidden state. Same data as the action-item-collections ' +
      'section of `transcend inventory pull`.',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListActionItemCollectionsSchema,
    handler: async ({ limit, offset }) => {
      const all = await fetchAllActionItemCollections(createGraphqlRequestClient(clients.graphql));
      return createListResult(all.slice(offset, offset + limit), {
        totalCount: all.length,
        hasNextPage: offset + limit < all.length,
      });
    },
  });
}

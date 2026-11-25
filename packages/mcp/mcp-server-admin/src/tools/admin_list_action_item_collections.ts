import { defineTool, EmptySchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

export const listActionItemCollectionsSchema = EmptySchema;
export type ListActionItemCollectionsInput = Record<string, never>;

export function createAdminListActionItemCollectionsTool(clients: ToolClients) {
  return defineTool({
    name: 'admin_list_action_item_collections',
    description:
      'List action item collections (the `action-item-collections` section of transcend.yml). ' +
      'Same data as `transcend inventory pull --resources=actionItemCollections`.',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listActionItemCollectionsSchema,
    handler: async () => listAllYmlSection(clients, TranscendPullResource.ActionItemCollections),
  });
}

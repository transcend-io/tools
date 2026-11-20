import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import {
  ActionItemCollectionInput,
  type ActionItemCollectionInput as ActionItemCollectionSettings,
} from '@transcend-io/sdk';

export const writeActionItemCollectionsSchema = z.object({
  actionItemCollections: ymlItemsSchema(
    'Action item collections in transcend.yml `action-item-collections` shape. Each needs ' +
      '`title` and `productLine`. Matched by title. See config_get_schema.',
    50,
  ),
});
export type WriteActionItemCollectionsInput = z.infer<typeof writeActionItemCollectionsSchema>;

export function createWorkflowsWriteActionItemCollectionsTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_write_action_item_collections',
    description:
      'Create or update action item collections (the `action-item-collections` section of ' +
      'transcend.yml), matched by title. Push collections before action items that reference them. ' +
      'Same behavior as `transcend inventory push` for that section.',
    category: 'Workflows',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: writeActionItemCollectionsSchema,
    handler: async ({ actionItemCollections }) => {
      const decoded = decodeYmlItems<ActionItemCollectionSettings>(
        ActionItemCollectionInput,
        actionItemCollections,
        'action-item-collections',
        { uniqueBy: (item) => item.title },
      );
      return pushYmlSection(clients, { 'action-item-collections': decoded }, decoded.length);
    },
  });
}

import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { ActionItemInput, type ActionItemInput as ActionItemSettings } from '@transcend-io/sdk';

export const writeActionItemsSchema = z.object({
  actionItems: ymlItemsSchema(
    'Action items in transcend.yml `action-items` shape. Each needs `title`, `type`, and ' +
      '`collections` (collection titles). Matched by title. See config_get_schema.',
    { codec: ActionItemInput, max: 50 },
  ),
});
export type WriteActionItemsInput = z.infer<typeof writeActionItemsSchema>;

export function createAdminWriteActionItemsTool(clients: ToolClients) {
  return defineTool({
    name: 'admin_write_action_items',
    description:
      'Create or update `action-items` rows in transcend.yml shape, matched by title. Same as ' +
      'inventory push for that section.',
    category: 'Admin',
    readOnly: false,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: writeActionItemsSchema,
    handler: async ({ actionItems }) => {
      const decoded = decodeYmlItems<ActionItemSettings>(
        ActionItemInput,
        actionItems,
        'action-items',
        {
          uniqueBy: (item) => item.title,
        },
      );
      return pushYmlSection(clients, { 'action-items': decoded }, decoded.length);
    },
  });
}

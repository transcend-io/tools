import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { ActionInput, type ActionInput as ActionSettings } from '@transcend-io/sdk';

export const writeActionsSchema = z.object({
  actions: ymlItemsSchema(
    'Action settings in transcend.yml `actions` shape. Each needs `type` (such as ACCESS) of an ' +
      'existing action. Optional: requiresReview, waitingPeriod, regionList. See config_get_schema.',
    { codec: ActionInput, max: 20 },
  ),
  publishToPrivacyCenter: z
    .boolean()
    .optional()
    .describe('Publish privacy center changes after the update. Default false.'),
});
export type WriteActionsInput = z.infer<typeof writeActionsSchema>;

export function createDsrWriteActionsTool(clients: ToolClients) {
  return defineTool({
    name: 'dsr_write_actions',
    description:
      'Update request action settings (the `actions` section of transcend.yml), matched by ' +
      'request type. Actions already exist in every organization, so unknown types fail. Same ' +
      'behavior as `transcend inventory push` for that section. Returns success and per-item errors.',
    category: 'DSR Automation',
    readOnly: false,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: writeActionsSchema,
    handler: async ({ actions, publishToPrivacyCenter = false }) => {
      const decoded = decodeYmlItems<ActionSettings>(ActionInput, actions, 'actions', {
        uniqueBy: (item) => item.type,
      });
      return pushYmlSection(clients, { actions: decoded }, decoded.length, {
        publishToPrivacyCenter,
      });
    },
  });
}

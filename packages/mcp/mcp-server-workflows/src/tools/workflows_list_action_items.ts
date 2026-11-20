import { defineTool, EmptySchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

export const listActionItemsSchema = EmptySchema;
export type ListActionItemsInput = Record<string, never>;

export function createWorkflowsListActionItemsTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_list_action_items',
    description:
      'List action items (the `action-items` section of transcend.yml) for the organization. ' +
      'Same data as `transcend inventory pull --resources=actionItems`.',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listActionItemsSchema,
    handler: async () => listAllYmlSection(clients, TranscendPullResource.ActionItems),
  });
}

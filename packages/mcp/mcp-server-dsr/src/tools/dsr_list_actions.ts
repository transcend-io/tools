import { defineTool, EmptySchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

export const listActionsSchema = EmptySchema;
export type ListActionsInput = Record<string, never>;

export function createDsrListActionsTool(clients: ToolClients) {
  return defineTool({
    name: 'dsr_list_actions',
    description:
      'List request action settings (the `actions` section of transcend.yml) for the organization. ' +
      'Same data as `transcend inventory pull --resources=actions`.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listActionsSchema,
    handler: async () => listAllYmlSection(clients, TranscendPullResource.Actions),
  });
}

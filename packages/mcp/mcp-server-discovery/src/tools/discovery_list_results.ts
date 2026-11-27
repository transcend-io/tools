import { defineTool, EmptySchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

export const listDiscoveryResultsSchema = EmptySchema;
export type ListDiscoveryResultsInput = Record<string, never>;

export function createDiscoveryListResultsTool(clients: ToolClients) {
  return defineTool({
    name: 'discovery_list_results',
    description:
      'List system discovery results (the `system-discovery` section of transcend.yml). ' +
      'Same data as `transcend inventory pull --resources=systemDiscovery`.',
    category: 'Discovery',
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: listDiscoveryResultsSchema,
    handler: async () => listAllYmlSection(clients, TranscendPullResource.SystemDiscovery),
  });
}

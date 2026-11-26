import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import {
  SiloDiscoveryResultInput,
  siloDiscoveryResultKey,
  type SiloDiscoveryResultInput as SiloDiscoveryResultSettings,
} from '@transcend-io/sdk';

export const writeDiscoveryResultsSchema = z.object({
  results: ymlItemsSchema(
    'System discovery rows in transcend.yml `system-discovery` shape. Each needs `resourceId`, ' +
      '`plugin`, `suggestedCatalog`, `containsSensitiveData`, and `status`. Matched by ' +
      'resourceId and plugin. See config_get_schema.',
    { codec: SiloDiscoveryResultInput, max: 50 },
  ),
});
export type WriteDiscoveryResultsInput = z.infer<typeof writeDiscoveryResultsSchema>;

export function createDiscoveryWriteResultsTool(clients: ToolClients) {
  return defineTool({
    name: 'discovery_write_results',
    description:
      'Update existing `system-discovery` rows in transcend.yml shape (title, suggested catalog, ' +
      'ignore status). Same as inventory push for that section. Does not create new scan results.',
    category: 'Discovery',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: writeDiscoveryResultsSchema,
    handler: async ({ results }) => {
      const decoded = decodeYmlItems<SiloDiscoveryResultSettings>(
        SiloDiscoveryResultInput,
        results,
        'system-discovery',
        {
          uniqueBy: (item) => siloDiscoveryResultKey(item.resourceId, item.plugin),
        },
      );
      return pushYmlSection(clients, { 'system-discovery': decoded }, decoded.length);
    },
  });
}

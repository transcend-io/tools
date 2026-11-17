import {
  createGraphqlRequestClient,
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { fetchAllSiloDiscoveryResults } from '@transcend-io/sdk';

export const ListSystemDiscoverySchema = OffsetPaginationSchema;
export type ListSystemDiscoveryInput = z.infer<typeof ListSystemDiscoverySchema>;

export function createDiscoveryListSystemDiscoveryTool(clients: ToolClients) {
  return defineTool({
    name: 'discovery_list_system_discovery',
    description:
      'List system discovery results: data systems found by discovery plugins, with suggested ' +
      'catalog, plugin, sensitivity, region, and triage status. Same data as the ' +
      'system-discovery section of `transcend inventory pull`, minus the plaintext context.',
    category: 'Data Discovery',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListSystemDiscoverySchema,
    handler: async ({ limit, offset }) => {
      const all = await fetchAllSiloDiscoveryResults(createGraphqlRequestClient(clients.graphql));
      const page = all.slice(offset, offset + limit).map((result) => ({
        title: result.title,
        resourceId: result.resourceId,
        suggestedCatalog: result.suggestedCatalog.title,
        plugin: result.plugin.dataSilo.title,
        country: result.country,
        countrySubDivision: result.countrySubDivision,
        containsSensitiveData: result.containsSensitiveData,
        status: result.status,
      }));
      return createListResult(page, {
        totalCount: all.length,
        hasNextPage: offset + limit < all.length,
      });
    },
  });
}

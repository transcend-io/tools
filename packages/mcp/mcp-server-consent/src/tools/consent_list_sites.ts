import {
  createGraphqlRequestClient,
  createListResult,
  defineTool,
  derivePageInfo,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { fetchAllConsentSites, formatAttributeValues } from '@transcend-io/sdk';

export const ListSitesSchema = OffsetPaginationSchema;
export type ListSitesInput = z.infer<typeof ListSitesSchema>;

export function createConsentListSitesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_sites',
    description:
      'List consent sites (domains, hosts, websites and apps) that Airgap discovered or that were ' +
      'added by hand, with description, owner emails, team names and attributes. Same shape as ' +
      'the consent-sites section of transcend.yml.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListSitesSchema,
    handler: async ({ limit, offset }) => {
      const hosts = await fetchAllConsentSites(createGraphqlRequestClient(clients.graphql));
      const page = hosts.slice(offset, offset + limit).map((host) => ({
        host: host.host,
        site: host.site,
        description: host.description || undefined,
        owners: host.owners.map(({ email }) => email),
        teams: host.teams.map(({ name }) => name),
        attributes: formatAttributeValues(host.attributeValues ?? []),
      }));
      return createListResult(page, {
        totalCount: hosts.length,
        hasNextPage: derivePageInfo({
          offset,
          nodeCount: page.length,
          totalCount: hosts.length,
        }).hasNextPage,
      });
    },
  });
}

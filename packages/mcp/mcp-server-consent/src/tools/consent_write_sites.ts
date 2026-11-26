import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { ConsentSiteInput, type ConsentSiteInput as ConsentSite } from '@transcend-io/sdk';

export const WriteSitesSchema = z.object({
  sites: ymlItemsSchema(
    'Sites to create or update, matched by host, like the consent-sites section of ' +
      'transcend.yml. Use consent_list_sites for current values.',
    { codec: ConsentSiteInput },
  ),
});
export type WriteSitesInput = z.infer<typeof WriteSitesSchema>;

export function createConsentWriteSitesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_write_sites',
    description:
      'Create or update consent sites (domains, hosts, websites and apps) in Airgap, like the ' +
      'consent-sites section of transcend.yml. Sets description, owner emails, team names and ' +
      'attributes per host. Hosts not in the list are not deleted.',
    category: 'Consent Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteSitesSchema,
    handler: async ({ sites }) => {
      const decoded = decodeYmlItems<ConsentSite>(ConsentSiteInput, sites, 'consent-sites', {
        uniqueBy: (item) => item.host,
      });
      return pushYmlSection(clients, { 'consent-sites': decoded }, decoded.length);
    },
  });
}

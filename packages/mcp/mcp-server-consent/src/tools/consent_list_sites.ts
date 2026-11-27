import {
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { listYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

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
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: ListSitesSchema,
    handler: async ({ limit, offset }) =>
      listYmlSection(clients, TranscendPullResource.ConsentSites, { limit, offset }),
  });
}

import {
  createCollectedLogger,
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { RequestAction } from '@transcend-io/privacy-types';
import { fetchAllEnrichers } from '@transcend-io/sdk';

export const listEnrichersSchema = z.object({
  title: z.string().optional().describe('Only return enrichers whose title matches this text.'),
});
export type ListEnrichersInput = z.infer<typeof listEnrichersSchema>;

export function createDsrListEnrichersTool(clients: ToolClients) {
  return defineTool({
    name: 'dsr_list_enrichers',
    description:
      'List identity enrichers (the `preflights` section of transcend.yml) in the organization, ' +
      'in transcend.yml shape. Same data as `transcend inventory pull --resources=enrichers`.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listEnrichersSchema,
    handler: async ({ title }) => {
      const { logger } = createCollectedLogger();
      const enrichers = await fetchAllEnrichers(createGraphqlRequestClient(clients.graphql), {
        logger,
        filterBy: title ? { title } : undefined,
      });
      const data = enrichers.map((enricher) => ({
        title: enricher.title,
        url: enricher.url || undefined,
        type: enricher.type,
        'input-identifier': enricher.inputIdentifier?.name,
        'output-identifiers': enricher.identifiers.map(({ name }) => name),
        'privacy-actions':
          Object.values(RequestAction).length === enricher.actions.length
            ? undefined
            : enricher.actions,
        testRegex: enricher.testRegex || undefined,
        lookerQueryTitle: enricher.lookerQueryTitle || undefined,
        expirationDuration: parseInt(enricher.expirationDuration, 10),
        transitionRequestStatus: enricher.transitionRequestStatus || undefined,
        phoneNumbers: enricher.phoneNumbers?.length ? enricher.phoneNumbers : undefined,
        regionList: enricher.regionList?.length ? enricher.regionList : undefined,
        'data-subjects': enricher.dataSubjects.map(({ type }) => type),
      }));
      return { count: data.length, enrichers: data };
    },
  });
}

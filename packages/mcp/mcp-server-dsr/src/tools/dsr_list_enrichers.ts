import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

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
    handler: async ({ title }) =>
      listAllYmlSection(
        clients,
        TranscendPullResource.Enrichers,
        title
          ? (item) =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as { title?: string }).title === 'string' &&
              (item as { title: string }).title.includes(title)
          : undefined,
      ),
  });
}

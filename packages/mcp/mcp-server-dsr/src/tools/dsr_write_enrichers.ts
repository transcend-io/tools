import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { EnricherInput, type EnricherInput as EnricherSettings } from '@transcend-io/sdk';

export const writeEnrichersSchema = z.object({
  enrichers: ymlItemsSchema(
    'Enrichers in transcend.yml `preflights` shape. Each needs `title` and `output-identifiers`. ' +
      'New ones also need `input-identifier`. Matched by title. See config_get_schema.',
    50,
  ),
  publishToPrivacyCenter: z
    .boolean()
    .optional()
    .describe(
      'Publish privacy center changes from identifiers created along the way. Default false.',
    ),
});
export type WriteEnrichersInput = z.infer<typeof writeEnrichersSchema>;

export function createDsrWriteEnrichersTool(clients: ToolClients) {
  return defineTool({
    name: 'dsr_write_enrichers',
    description:
      'Create or update identity enrichers (the `preflights` section of transcend.yml), matched ' +
      'by title. Missing identifiers and data subjects are created. Same behavior as ' +
      '`transcend inventory push` for that section. Returns success and per-item errors.',
    category: 'DSR Automation',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: writeEnrichersSchema,
    handler: async ({ enrichers, publishToPrivacyCenter = false }) => {
      const decoded = decodeYmlItems<EnricherSettings>(EnricherInput, enrichers, 'preflights', {
        uniqueBy: (item) => item.title,
      });
      return pushYmlSection(clients, { preflights: decoded }, decoded.length, {
        publishToPrivacyCenter,
      });
    },
  });
}

import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  fetchAllEnrichers,
  fetchIdentifiersAndCreateMissing,
  syncEnricher,
} from '@transcend-io/sdk';
import { ensureAllDataSubjectsExist, EnricherInput } from '@transcend-io/sdk/transcend-yml';
import { decodeCodec } from '@transcend-io/type-utils';

import { createCollectedLogger } from '../helpers/collectingLogger.js';
import { decodeItems, errorMessage, type ItemError } from '../helpers/syncItems.js';

export const writeEnrichersSchema = z.object({
  enrichers: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(50)
    .describe(
      'Enrichers in transcend.yml `preflights` shape. Each needs `title` and `output-identifiers`. ' +
        'New ones also need `input-identifier`. Matched by title. See config_get_schema.',
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
      const client = createGraphqlRequestClient(clients.graphql);
      const { logger, logs } = createCollectedLogger();

      const { valid, errors } = decodeItems(
        (raw) => decodeCodec(EnricherInput, raw, false),
        enrichers,
        (raw, index) => (typeof raw['title'] === 'string' ? raw['title'] : `#${index}`),
      );

      let synced = 0;
      if (valid.length > 0) {
        const input = { preflights: valid };
        const existingTitles = new Set(
          (await fetchAllEnrichers(client, { logger })).map(({ title }) => title),
        );
        const [identifierByName, dataSubjectsByName] = await Promise.all([
          fetchIdentifiersAndCreateMissing(client, {
            input,
            skipPublish: !publishToPrivacyCenter,
            logger,
          }),
          ensureAllDataSubjectsExist(input, client, false, { logger }),
        ]);

        for (const enricher of valid) {
          // The SDK silently skips a new enricher that has no input identifier
          if (!existingTitles.has(enricher.title) && !enricher['input-identifier']) {
            errors.push({
              item: enricher.title,
              message: 'input-identifier is required to create a new enricher',
            } satisfies ItemError);
            continue;
          }
          try {
            await syncEnricher(client, {
              input: enricher,
              identifierByName,
              dataSubjectsByName,
              logger,
            });
            synced += 1;
          } catch (error) {
            errors.push({ item: enricher.title, message: errorMessage(error) });
          }
        }
      }

      return {
        success: errors.length === 0,
        synced,
        errors,
        ...(errors.length > 0 && { logs }),
      };
    },
  });
}

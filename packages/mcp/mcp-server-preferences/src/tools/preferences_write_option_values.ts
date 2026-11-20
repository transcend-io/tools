import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import {
  ConsentPreferenceTopicOptionValue,
  syncPreferenceOptionValues,
  type ConsentPreferenceTopicOptionValue as OptionValueInput,
} from '@transcend-io/sdk';

import { decodeItems, runSync } from '../helpers/syncRun.js';

export const WriteOptionValuesSchema = z.object({
  optionValues: z
    .array(
      z.object({
        slug: z.string().describe('API slug. Upsert key: an existing slug is updated.'),
        title: z.string().describe('Display title'),
      }),
    )
    .min(1)
    .max(200)
    .describe(
      'Option values to create or update. Same shape as the transcend.yml preference-options section.',
    ),
});

export type WriteOptionValuesInput = z.infer<typeof WriteOptionValuesSchema>;

export function createPreferencesWriteOptionValuesTool(clients: ToolClients) {
  return defineTool({
    name: 'preferences_write_option_values',
    description:
      'Create or update preference option values, keyed by slug. Unchanged values are skipped ' +
      'and nothing is deleted. Same as the preference-options section of `transcend inventory ' +
      'push`. Returns success and any errors.',
    category: 'Preference Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteOptionValuesSchema,
    handler: async ({ optionValues }) => {
      const items = decodeItems<OptionValueInput>(
        ConsentPreferenceTopicOptionValue,
        optionValues,
        'preference-options',
      );
      const client = createGraphqlRequestClient(clients.graphql);
      return runSync(items.length, (logger) =>
        syncPreferenceOptionValues(client, items, { logger }),
      );
    },
  });
}

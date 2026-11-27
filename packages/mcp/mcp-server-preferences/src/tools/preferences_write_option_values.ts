import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import {
  ConsentPreferenceTopicOptionValue,
  type ConsentPreferenceTopicOptionValue as OptionValueInput,
} from '@transcend-io/sdk';

export const WriteOptionValuesSchema = z.object({
  optionValues: ymlItemsSchema(
    'Option values to create or update. Same shape as the transcend.yml preference-options section.',
    { codec: ConsentPreferenceTopicOptionValue, max: 200 },
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
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: WriteOptionValuesSchema,
    handler: async ({ optionValues }) => {
      const items = decodeYmlItems<OptionValueInput>(
        ConsentPreferenceTopicOptionValue,
        optionValues,
        'preference-options',
        { uniqueBy: (item) => item.slug },
      );
      return pushYmlSection(clients, { 'preference-options': items }, items.length);
    },
  });
}

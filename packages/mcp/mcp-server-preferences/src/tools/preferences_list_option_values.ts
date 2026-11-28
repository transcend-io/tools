import { defineTool, EmptySchema, type ToolClients } from '@transcend-io/mcp-server-base';
import { listAllYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import { TranscendPullResource } from '@transcend-io/sdk';

export const ListOptionValuesSchema = EmptySchema;
export type ListOptionValuesInput = Record<string, never>;

export function createPreferencesListOptionValuesTool(clients: ToolClients) {
  return defineTool({
    name: 'preferences_list_option_values',
    description:
      'List the preference option values of the organization (slug and title). These are the ' +
      'choices preference topics can offer. Same as the preference-options section of ' +
      '`transcend inventory pull`.',
    category: 'Preference Management',
    readOnly: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: ListOptionValuesSchema,
    handler: async () => listAllYmlSection(clients, TranscendPullResource.PreferenceOptions),
  });
}

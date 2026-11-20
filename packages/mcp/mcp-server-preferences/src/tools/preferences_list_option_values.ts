import {
  createGraphqlRequestClient,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { fetchAllPreferenceOptionValues } from '@transcend-io/sdk';

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
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListOptionValuesSchema,
    handler: async () => {
      const values = await fetchAllPreferenceOptionValues(
        createGraphqlRequestClient(clients.graphql),
      );
      return {
        count: values.length,
        optionValues: values.map(({ id, slug, title }) => ({
          id,
          slug,
          title: title.defaultMessage,
        })),
      };
    },
  });
}

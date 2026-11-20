import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  MAX_SECTION_WRITE_MESSAGES,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { IntlMessageInput } from '@transcend-io/sdk';

export const WriteIntlMessagesSchema = z.object({
  messages: ymlItemsSchema(
    'Messages to create or update by id. Each needs id. Optional: defaultMessage, description, ' +
      'targetReactIntlId, translations (locale code to text). Same shape as the messages ' +
      'section of transcend.yml; see config_get_schema.',
    MAX_SECTION_WRITE_MESSAGES,
  ),
});
export type WriteIntlMessagesInput = z.infer<typeof WriteIntlMessagesSchema>;

export function createPrivacyCenterWriteIntlMessagesTool(clients: ToolClients) {
  return defineTool({
    name: 'privacy_center_write_intl_messages',
    description:
      'Create or update internationalized messages by id: default text and translations. ' +
      'Same as the messages section of `transcend inventory push`. Ids must be unique in the ' +
      'call. Returns success, a count, and errors.',
    category: 'Privacy Center',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteIntlMessagesSchema,
    handler: async ({ messages }) => {
      const inputs = decodeYmlItems<IntlMessageInput>(IntlMessageInput, messages, 'messages', {
        uniqueBy: (item) => item.id,
      });
      return pushYmlSection(clients, { messages: inputs }, inputs.length);
    },
  });
}

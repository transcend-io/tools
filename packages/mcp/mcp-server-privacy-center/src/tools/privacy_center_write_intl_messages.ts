import {
  createCollectedLogger,
  createGraphqlRequestClient,
  decodeItems,
  defineTool,
  runSync,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { IntlMessageInput, syncIntlMessages } from '@transcend-io/sdk';

export const WriteIntlMessagesSchema = z.object({
  messages: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(500)
    .describe(
      'Messages to create or update by id. Each needs id. Optional: defaultMessage, description, ' +
        'targetReactIntlId, translations (locale code to text). Same shape as the messages ' +
        'section of transcend.yml; see config_get_schema.',
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
      const inputs = decodeItems<IntlMessageInput>(IntlMessageInput, messages, 'messages');
      const { logger, logs } = createCollectedLogger();
      return runSync(
        () => syncIntlMessages(createGraphqlRequestClient(clients.graphql), inputs, { logger }),
        logs,
        inputs.length,
      );
    },
  });
}

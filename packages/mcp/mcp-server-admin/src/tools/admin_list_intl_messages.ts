import {
  createListResult,
  createGraphqlRequestClient,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { fetchAllMessages } from '@transcend-io/sdk';

import { createCollectedLogger } from '../helpers/collectingLogger.js';

export const ListIntlMessagesSchema = OffsetPaginationSchema.extend({
  text: z
    .string()
    .optional()
    .describe('Keep messages whose id, default message or description contains this text.'),
  includeTranslations: z
    .boolean()
    .optional()
    .describe('Include the translations of each message. Defaults to false.'),
});
export type ListIntlMessagesInput = z.infer<typeof ListIntlMessagesSchema>;

export function createAdminListIntlMessagesTool(clients: ToolClients) {
  return defineTool({
    name: 'admin_list_intl_messages',
    description:
      'List the internationalized messages used by the privacy center and consent manager. ' +
      'Same as the messages section of `transcend inventory pull`. Translations are left out ' +
      'unless includeTranslations is true.',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListIntlMessagesSchema,
    handler: async ({ limit, offset, text, includeTranslations = false }) => {
      const { logger } = createCollectedLogger();
      const all = await fetchAllMessages(createGraphqlRequestClient(clients.graphql), { logger });
      const needle = text?.toLowerCase();
      const matching = needle
        ? all.filter((message) =>
            [message.id, message.defaultMessage, message.description].some((value) =>
              value?.toLowerCase().includes(needle),
            ),
          )
        : all;
      const page = matching.slice(offset, offset + limit).map((message) => ({
        id: message.id,
        defaultMessage: message.defaultMessage,
        description: message.description,
        targetReactIntlId: message.targetReactIntlId ?? undefined,
        ...(includeTranslations
          ? {
              translations: Object.fromEntries(
                message.translations.map(({ locale, value }) => [locale, value]),
              ),
            }
          : { translationCount: message.translations.length }),
      }));
      return createListResult(page, {
        totalCount: matching.length,
        hasNextPage: offset + limit < matching.length,
      });
    },
  });
}

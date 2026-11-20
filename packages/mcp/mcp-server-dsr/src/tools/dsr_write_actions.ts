import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ActionInput, fetchAllActions, syncAction } from '@transcend-io/sdk';
import { decodeCodec } from '@transcend-io/type-utils';

import { createCollectedLogger } from '../helpers/collectingLogger.js';
import { decodeItems, errorMessage } from '../helpers/syncItems.js';

export const writeActionsSchema = z.object({
  actions: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(20)
    .describe(
      'Action settings in transcend.yml `actions` shape. Each needs `type` (such as ACCESS) of an ' +
        'existing action. Optional: requiresReview, waitingPeriod, regionList. See config_get_schema.',
    ),
  publishToPrivacyCenter: z
    .boolean()
    .optional()
    .describe('Publish privacy center changes after the update. Default false.'),
});
export type WriteActionsInput = z.infer<typeof writeActionsSchema>;

export function createDsrWriteActionsTool(clients: ToolClients) {
  return defineTool({
    name: 'dsr_write_actions',
    description:
      'Update request action settings (the `actions` section of transcend.yml), matched by ' +
      'request type. Actions already exist in every organization, so unknown types fail. Same ' +
      'behavior as `transcend inventory push` for that section. Returns success and per-item errors.',
    category: 'DSR Automation',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: writeActionsSchema,
    handler: async ({ actions, publishToPrivacyCenter = false }) => {
      const client = createGraphqlRequestClient(clients.graphql);
      const { logger, logs } = createCollectedLogger();

      const { valid, errors } = decodeItems(
        (raw) => decodeCodec(ActionInput, raw, false),
        actions,
        (raw, index) => (typeof raw['type'] === 'string' ? raw['type'] : `#${index}`),
      );

      let synced = 0;
      if (valid.length > 0) {
        const existing = await fetchAllActions(client, { logger });
        for (const action of valid) {
          const match = existing.find(({ type }) => type === action.type);
          if (!match) {
            errors.push({
              item: action.type,
              message: `No action with type ${action.type} exists in the organization`,
            });
            continue;
          }
          try {
            await syncAction(
              client,
              { action, actionId: match.id, skipPublish: !publishToPrivacyCenter },
              { logger },
            );
            synced += 1;
          } catch (error) {
            errors.push({ item: action.type, message: errorMessage(error) });
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

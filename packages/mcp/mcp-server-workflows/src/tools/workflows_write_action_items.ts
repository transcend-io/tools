import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { syncActionItems } from '@transcend-io/sdk';
import { ActionItemInput } from '@transcend-io/sdk/transcend-yml';
import { decodeCodec } from '@transcend-io/type-utils';

import { createCollectedLogger } from '../helpers/collectingLogger.js';
import { decodeItems, summarizeLogs } from '../helpers/decodeItems.js';

export const WriteActionItemsSchema = z.object({
  items: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(100)
    .describe(
      'Items as in the action-items section of transcend.yml: title, type, collections ' +
        '(existing collection titles), plus optional fields. See config_get_schema.',
    ),
});
export type WriteActionItemsInput = z.infer<typeof WriteActionItemsSchema>;

export function createWorkflowsWriteActionItemsTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_write_action_items',
    description:
      'Create or update action items, matched by title plus collections. Same as the ' +
      'action-items section of `transcend inventory push`. Collections must exist first. ' +
      'Returns success, errors, and warnings.',
    category: 'Workflows',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteActionItemsSchema,
    handler: async ({ items }) => {
      const inputs = decodeItems(
        (item) => decodeCodec(ActionItemInput, item, false),
        items,
        'Action',
      );

      const { logger, logs } = createCollectedLogger();
      const success = await syncActionItems(createGraphqlRequestClient(clients.graphql), inputs, {
        logger,
      });
      const { errors, warnings } = summarizeLogs(logs);

      return {
        success,
        count: inputs.length,
        errors,
        ...(warnings.length > 0 && { warnings }),
      };
    },
  });
}

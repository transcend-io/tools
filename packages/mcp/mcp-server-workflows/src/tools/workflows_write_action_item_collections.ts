import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { syncActionItemCollections } from '@transcend-io/sdk';
import { ActionItemCollectionInput } from '@transcend-io/sdk/transcend-yml';
import { decodeCodec } from '@transcend-io/type-utils';

import { createCollectedLogger } from '../helpers/collectingLogger.js';
import { decodeItems, summarizeLogs } from '../helpers/decodeItems.js';

export const WriteActionItemCollectionsSchema = z.object({
  items: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(100)
    .describe(
      'Items as in the action-item-collections section of transcend.yml: title, productLine, ' +
        'plus optional fields. See config_get_schema.',
    ),
});
export type WriteActionItemCollectionsInput = z.infer<typeof WriteActionItemCollectionsSchema>;

export function createWorkflowsWriteActionItemCollectionsTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_write_action_item_collections',
    description:
      'Create or update action item collections, matched by title. Same as the ' +
      'action-item-collections section of `transcend inventory push`. Returns success, ' +
      'errors, and warnings.',
    category: 'Workflows',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteActionItemCollectionsSchema,
    handler: async ({ items }) => {
      const inputs = decodeItems(
        (item) => decodeCodec(ActionItemCollectionInput, item, false),
        items,
        'Collection',
      );

      const { logger, logs } = createCollectedLogger();
      const success = await syncActionItemCollections(
        createGraphqlRequestClient(clients.graphql),
        inputs,
        { logger },
      );
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

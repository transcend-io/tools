import {
  createGraphqlRequestClient,
  createListResult,
  defineTool,
  ErrorCode,
  OffsetPaginationSchema,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ActionItemCode } from '@transcend-io/privacy-types';
import { fetchAllActionItems } from '@transcend-io/sdk';

const ACTION_ITEM_CODES: string[] = Object.values(ActionItemCode);

export const ListActionItemsSchema = OffsetPaginationSchema.extend({
  resolved: z
    .boolean()
    .optional()
    .describe('Only action items that are resolved (true) or open (false). Default: both.'),
  types: z
    .array(z.string())
    .optional()
    .describe('Only these action item type codes, for example ONBOARDING. Default: all types.'),
});
export type ListActionItemsInput = z.infer<typeof ListActionItemsSchema>;

export function createWorkflowsListActionItemsTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_list_action_items',
    description:
      'List action items with title, type, collections, assignees, priority, due date, and ' +
      'resolved state. Same data as the action-items section of `transcend inventory pull`.',
    category: 'Workflows',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListActionItemsSchema,
    handler: async ({ limit, offset, resolved, types }) => {
      const unknownTypes = (types ?? []).filter((type) => !ACTION_ITEM_CODES.includes(type));
      if (unknownTypes.length > 0) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `Unknown action item types: ${unknownTypes.join(', ')}. ` +
            `Valid types: ${ACTION_ITEM_CODES.join(', ')}`,
          false,
        );
      }

      const all = await fetchAllActionItems(createGraphqlRequestClient(clients.graphql), {
        filterBy: {
          ...(resolved !== undefined && { resolved }),
          ...(types && types.length > 0 && { type: types as ActionItemCode[] }),
        },
      });
      const page = all.slice(offset, offset + limit).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        collections: item.collections.map((collection) => collection.title),
        resolved: item.resolved,
        priority: item.priority,
        dueDate: item.dueDate,
        teams: item.teams.map((team) => team.name),
        users: item.users.map((user) => user.email),
        customerExperienceActionItemId: item.customerExperienceActionItemIds[0],
      }));

      return createListResult(page, {
        totalCount: all.length,
        hasNextPage: offset + limit < all.length,
      });
    },
  });
}

import { createListResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { OrderDirection, ScopeName } from '@transcend-io/privacy-types';

import type { ScopeName as GraphqlScopeName } from '../__generated__/graphql.js';
import type { AdminMixin } from '../graphql.js';

/** GraphQL UserOrderField values exposed on admin_list_users */
const USER_ORDER_FIELDS = ['name', 'createdAt', 'updatedAt'] as const;

export const ListUsersSchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Results per page (1-100, default: 50)'),
  offset: z.coerce
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Number of results to skip for offset pagination (default: 0)'),
  text: z
    .string()
    .optional()
    .describe(
      'Case-insensitive substring search across user name OR email (ILIKE). ' +
        'There are no separate name/email filter fields.',
    ),
  isAdmin: z.boolean().optional().describe('Filter to organization administrators only when true'),
  isInvited: z
    .boolean()
    .optional()
    .describe('Filter to invited (not yet onboarded) users when true'),
  isLocked: z.boolean().optional().describe('Filter to account-locked users when true'),
  canRevealMultiTenantSombraSecret: z
    .boolean()
    .optional()
    .describe('Filter by whether the user can reveal the multi-tenant Sombra secret'),
  ids: z.array(z.string().uuid()).optional().describe('Filter to specific user UUIDs'),
  teamIds: z
    .array(z.string().uuid())
    .optional()
    .describe(
      'Filter to users on these team UUIDs. Resolve team names to IDs with admin_list_teams first.',
    ),
  scopeNames: z
    .array(z.nativeEnum(ScopeName))
    .optional()
    .describe('Filter by directly assigned ScopeName enum values (not free text)'),
  derivedScopeNames: z
    .array(z.nativeEnum(ScopeName))
    .optional()
    .describe(
      'Filter by derived ScopeName values (includes grants via teams, dependencies, and admins)',
    ),
  lastLoggedInAfter: z
    .string()
    .optional()
    .describe('ISO 8601 lower bound for lastLoggedIn (inclusive)'),
  lastLoggedInBefore: z
    .string()
    .optional()
    .describe('ISO 8601 upper bound for lastLoggedIn (inclusive)'),
  orderField: z
    .enum(USER_ORDER_FIELDS)
    .optional()
    .describe('Field to sort by (default: name). One of name, createdAt, updatedAt'),
  orderDirection: z
    .nativeEnum(OrderDirection)
    .optional()
    .describe('Sort direction ASC or DESC (default: ASC, matching Admin Users)'),
});
export type ListUsersInput = z.infer<typeof ListUsersSchema>;

export function createAdminListUsersTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_list_users',
    description:
      'List users in your Transcend organization with the same filters as Administration → Users. ' +
      'text searches name and email (case-insensitive substring). ' +
      'Team filters need UUIDs — call admin_list_teams then pass teamIds. ' +
      'scopeNames / derivedScopeNames use ScopeName enum values. ' +
      'Pagination is offset-based (limit + offset); default sort is name ASC.',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListUsersSchema,
    handler: async ({
      limit,
      offset,
      text,
      isAdmin,
      isInvited,
      isLocked,
      canRevealMultiTenantSombraSecret,
      ids,
      teamIds,
      scopeNames,
      derivedScopeNames,
      lastLoggedInAfter,
      lastLoggedInBefore,
      orderField,
      orderDirection,
    }) => {
      const filterBy = {
        ...(text ? { text } : {}),
        ...(typeof isAdmin === 'boolean' ? { isAdmin } : {}),
        ...(typeof isInvited === 'boolean' ? { isInvited } : {}),
        ...(typeof isLocked === 'boolean' ? { isLocked } : {}),
        ...(typeof canRevealMultiTenantSombraSecret === 'boolean'
          ? { canRevealMultiTenantSombraSecret }
          : {}),
        ...(ids?.length ? { ids } : {}),
        ...(teamIds?.length ? { teamIds } : {}),
        ...(scopeNames?.length
          ? { scopeNames: scopeNames as GraphqlScopeName[] }
          : {}),
        ...(derivedScopeNames?.length
          ? { derivedScopeNames: derivedScopeNames as GraphqlScopeName[] }
          : {}),
        ...(lastLoggedInAfter ? { lastLoggedInAfter } : {}),
        ...(lastLoggedInBefore ? { lastLoggedInBefore } : {}),
      };
      const result = await graphql.listUsers({
        first: limit ?? 50,
        offset: offset ?? 0,
        filterBy,
        orderBy: [
          {
            field: orderField ?? 'name',
            direction: orderDirection ?? OrderDirection.Asc,
          },
        ],
      });
      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}

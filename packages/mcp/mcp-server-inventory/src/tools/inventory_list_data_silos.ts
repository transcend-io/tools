import {
  assertOffsetInRange,
  createListResult,
  defineTool,
  describeOutcome,
  isoDate,
  nonEmptyList,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin, ListDataSilosSortField } from '../graphql.js';

export const ListDataSilosSchema = z
  .object({
    text: z.string().optional().describe('Free-text search across data silos'),
    titles: nonEmptyList('Exact system titles to match'),
    ids: nonEmptyList('Specific data silo IDs to fetch'),
    types: nonEmptyList(
      'Catalog integration types, e.g. "server", "salesforce". Search them with ' +
        '`inventory_list_catalog_integrations`.',
    ),
    ownerIds: nonEmptyList(
      'Transcend user IDs assigned as owner. Resolve names or emails with `admin_list_users`.',
    ),
    teamIds: nonEmptyList('Team IDs assigned as owner. Resolve names with `admin_list_teams`.'),
    unassignedOnly: z
      .boolean()
      .optional()
      .describe(
        'Only systems with nobody assigned as owner. Covers owners; the API has no team ' +
          'equivalent, so filter unassigned teams from the returned `teams` instead.',
      ),
    isLive: z.boolean().optional().describe('Whether the system is live for DSR processing'),
    countries: nonEmptyList('ISO country codes the system is hosted in, e.g. "IE"'),
    vendorIds: nonEmptyList('Linked vendor IDs; see `inventory_list_vendors`'),
    businessEntityIds: nonEmptyList(
      'Linked business entity IDs; see `inventory_list_business_entities`',
    ),
    createdAfter: isoDate('createdAfter').describe('Only systems created strictly after this date'),
    createdBefore: isoDate('createdBefore').describe('Only systems created on or before this date'),
    sortBy: z
      .enum(['title', 'createdAt'], { message: 'sortBy must be one of: title, createdAt' })
      .optional()
      .describe('Column to sort on. Omit for the API default order.'),
    sortDirection: z
      .enum(['ASC', 'DESC'], { message: 'sortDirection must be ASC or DESC' })
      .optional()
      .default('ASC')
      .describe('Sort direction. Only applied alongside `sortBy`.'),
    includeDetails: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Also return description, notes, vendor, purposes, business entities, country, ' +
          'contacts and classified-field count. Roughly triples the bytes per row.',
      ),
  })
  .merge(OffsetPaginationSchema);
export type ListDataSilosInput = z.infer<typeof ListDataSilosSchema>;

/**
 * Caller-facing sort names mapped onto `DataSiloBulkPreviewOrderField`.
 *
 * Keyed by the schema's own `sortBy` union so a new enum value without a
 * mapping fails the build rather than silently sorting by `undefined`.
 */
const SORT_FIELDS: Record<NonNullable<ListDataSilosInput['sortBy']>, ListDataSilosSortField> = {
  title: 'title',
  createdAt: 'createdAt',
};

export function createInventoryListDataSilosTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_list_data_silos',
    description:
      'List the data systems (data silos) in your data map. Every row carries its owners and ' +
      'teams, so ownership questions — who owns this, which systems are unassigned — are ' +
      'answered from the list itself rather than a detail read per system. Pass ' +
      '`unassignedOnly` for systems with no owner, `ownerIds` / `teamIds` to filter by ' +
      'assignment, or `types` to scope to one kind of integration. `includeDetails` adds ' +
      'vendor, purposes, business entities, contacts and field counts. `totalCount` is the ' +
      'full match count, not the size of this page.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListDataSilosSchema,
    handler: async ({
      text,
      titles,
      ids,
      types,
      ownerIds,
      teamIds,
      unassignedOnly,
      isLive,
      countries,
      vendorIds,
      businessEntityIds,
      createdAfter,
      createdBefore,
      sortBy,
      sortDirection,
      includeDetails,
      limit,
      offset,
    }) => {
      // Named as the caller passed them, not as the API names them: reporting
      // `createdAtAfter` back would send an agent looking for an argument this
      // tool does not have. The two booleans are not interchangeable —
      // `isLive: false` selects the non-live systems, where `unassignedOnly:
      // false` asks for no filter at all.
      const appliedFilters = [
        ...(text ? ['text'] : []),
        ...(titles?.length ? ['titles'] : []),
        ...(ids?.length ? ['ids'] : []),
        ...(types?.length ? ['types'] : []),
        ...(ownerIds?.length ? ['ownerIds'] : []),
        ...(teamIds?.length ? ['teamIds'] : []),
        ...(unassignedOnly ? ['unassignedOnly'] : []),
        ...(isLive === undefined ? [] : ['isLive']),
        ...(countries?.length ? ['countries'] : []),
        ...(vendorIds?.length ? ['vendorIds'] : []),
        ...(businessEntityIds?.length ? ['businessEntityIds'] : []),
        ...(createdAfter ? ['createdAfter'] : []),
        ...(createdBefore ? ['createdBefore'] : []),
      ];

      const result = await graphql.listDataSilos({
        first: limit,
        offset,
        text,
        titles,
        ids,
        types,
        ownerIds,
        teamIds,
        unassignedOnly,
        isLive,
        countries,
        vendorIds,
        businessEntityIds,
        createdAfter,
        createdBefore,
        includeDetails,
        ...(sortBy && { sortField: SORT_FIELDS[sortBy], sortDirection }),
      });

      const totalCount = result.totalCount ?? 0;

      assertOffsetInRange({ subject: 'data system', offset, totalCount, appliedFilters });

      return createListResult(result.nodes, {
        totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        paginationNote: describeOutcome({
          subject: 'data systems',
          returned: result.nodes.length,
          totalCount,
          offset,
          limit,
          appliedFilters,
        }),
      });
    },
  });
}

import {
  createToolResult,
  defineTool,
  EmptySchema,
  groupBy,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export function createInventoryAnalyzeTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_analyze',
    description:
      'Analyze your data inventory: data systems by type, ownership coverage (how many systems ' +
      'have no owner, no team, or neither), vendor distribution, and data point coverage. ' +
      'Reports counts across the whole org; to list the systems with no owner, call ' +
      '`inventory_list_data_silos` with `unassignedOnly`.',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    handler: async (_args) => {
      // `all: true` fully paginates each entity so the reported totals and
      // breakdowns are accurate for orgs with >100 of any.
      const [dataSilosResult, vendorsResult, identifiersResult, categoriesResult] =
        await Promise.all([
          graphql.listDataSilos({ all: true }),
          graphql.listVendors({ all: true }),
          graphql.listIdentifiers({ all: true }),
          graphql.listDataCategories({ all: true }),
        ]);

      const dataSilos = dataSilosResult.nodes;
      const vendors = vendorsResult.nodes;
      const identifiers = identifiersResult.nodes;
      const categories = categoriesResult.nodes;
      const totalCategories = categories.length;

      const liveDataSilos = dataSilos.filter((ds) => ds.isLive);

      // Owner and team are counted separately, and `withoutOwner` is the
      // headline, because it is the only one of the three the API can filter
      // on: `unassignedOnly` maps to `includeNulls: ['OWNERS']`. Leading with
      // `withoutOwnerOrTeam` would name a number that no follow-up call can
      // reproduce, since a team-only silo is excluded here but present in an
      // `unassignedOnly` list.
      const withoutOwner = dataSilos.filter((ds) => ds.owners.length === 0);
      const withoutTeam = dataSilos.filter((ds) => ds.teams.length === 0);
      const withoutOwnerOrTeam = withoutOwner.filter((ds) => ds.teams.length === 0);

      return createToolResult(true, {
        summary: {
          totalDataSilos: dataSilos.length,
          liveDataSilos: liveDataSilos.length,
          dataSilosWithoutOwner: withoutOwner.length,
          totalVendors: vendors.length,
          totalIdentifiers: identifiers.length,
          totalCategories,
        },
        ownership: {
          withoutOwner: withoutOwner.length,
          withoutTeam: withoutTeam.length,
          withoutOwnerOrTeam: withoutOwnerOrTeam.length,
          // Scoped by integration type so a rule like "one person owns the GCP
          // systems" can be sized before anyone starts assigning. Grouped over
          // `withoutOwner` so it matches what `unassignedOnly` returns.
          withoutOwnerByType: groupBy(withoutOwner, 'type'),
          listWith:
            'inventory_list_data_silos with unassignedOnly: true returns the withoutOwner set. ' +
            'It has no team equivalent, so withoutOwnerOrTeam has to be narrowed from the ' +
            '`teams` on those rows.',
        },
        breakdown: {
          dataSilosByType: groupBy(dataSilos, 'type'),
          dataSilosByOuterType: groupBy(
            dataSilos.filter((ds) => ds.outerType),
            'outerType' as keyof (typeof dataSilos)[0],
          ),
        },
        topIdentifiers: identifiers.slice(0, 10).map((id) => ({
          name: id.name,
          type: id.type,
          isRequired: id.isRequiredInForm,
        })),
        topCategories: categories.slice(0, 10).map((cat) => ({
          name: cat.name,
          category: cat.category,
        })),
        recommendations: [
          dataSilos.length === 0 ? 'Add data silos to map your data landscape' : null,
          liveDataSilos.length < dataSilos.length
            ? `${dataSilos.length - liveDataSilos.length} data silos are not live - consider activating them`
            : null,
          withoutOwner.length > 0
            ? `${withoutOwner.length} data silos have no owner - list exactly those with ` +
              'inventory_list_data_silos (unassignedOnly: true) and assign with ' +
              `inventory_write_data_silo (ownerEmails / teamNames). ${withoutOwnerOrTeam.length} ` +
              'of them have no team either, so nobody is accountable.'
            : null,
          vendors.length === 0 ? 'Add vendors to track third-party data processors' : null,
        ].filter(Boolean),
      });
    },
  });
}

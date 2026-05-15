import {
  createToolResult,
  defineTool,
  EmptySchema,
  envelopeSchema,
  groupBy,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

import type { InventoryMixin } from '../graphql.js';

export function createInventoryAnalyzeTool(clients: ToolClients) {
  const graphql = clients.graphql as InventoryMixin;
  return defineTool({
    name: 'inventory_analyze',
    description:
      'Analyze your data inventory including data silos by type, vendor distribution, and data point coverage',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    outputZodSchema: envelopeSchema(
      z.object({
        summary: z.object({
          totalDataSilos: z.number(),
          liveDataSilos: z.number(),
          totalVendors: z.number(),
          totalIdentifiers: z.number(),
          totalCategories: z.number(),
        }),
        breakdown: z.object({
          dataSilosByType: z.record(z.string(), z.number()),
          dataSilosByOuterType: z.record(z.string(), z.number()),
        }),
        topIdentifiers: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            isRequired: z.boolean().optional(),
          }),
        ),
        topCategories: z.array(
          z.object({
            name: z.string(),
            category: z.string(),
          }),
        ),
        recommendations: z.array(z.string()),
      }),
    ),
    handler: async (_args) => {
      const [dataSilosResult, vendorsResult, identifiersResult, categoriesResult] =
        await Promise.all([
          graphql.listDataSilos({ first: 100 }),
          graphql.listVendors({ first: 100 }),
          graphql.listIdentifiers({ first: 100 }),
          graphql.listDataCategories({ first: 100 }),
        ]);

      const dataSilos = dataSilosResult.nodes;
      const vendors = vendorsResult.nodes;
      const identifiers = identifiersResult.nodes;
      const categories = categoriesResult.nodes;

      const liveDataSilos = dataSilos.filter((ds) => ds.isLive);

      return createToolResult(true, {
        summary: {
          totalDataSilos: dataSilos.length,
          liveDataSilos: liveDataSilos.length,
          totalVendors: vendors.length,
          totalIdentifiers: identifiers.length,
          totalCategories: categories.length,
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
          vendors.length === 0 ? 'Add vendors to track third-party data processors' : null,
        ].filter(Boolean),
      });
    },
  });
}

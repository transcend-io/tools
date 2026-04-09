import {
  createToolResult,
  groupBy,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { InventoryMixin } from '../graphql.js';
import { InventoryAnalyzeSchema } from '../schemas.js';

export function createInventoryAnalyzeTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as InventoryMixin;
  return {
    name: 'inventory_analyze',
    description:
      'Analyze your data inventory including data silos by type, vendor distribution, and data point coverage',
    category: 'Data Inventory',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(InventoryAnalyzeSchema, args);
      if (!parsed.success) return parsed.error;
      try {
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
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}

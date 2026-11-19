import {
  createListResult,
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DocsCatalogGraphqlClient } from '../catalogGraphql.js';
import { formatCatalogIntegrationMarkdown } from '../formatCatalogMarkdown.js';
import { INTEGRATION_PRIMARY_GUIDE_URL } from '../integrationPublicGuides.js';

const SEARCH_PAGE_SIZE = 25;

export const DocsIntegrationLookupSchema = z
  .object({
    query: z
      .string()
      .optional()
      .describe(
        'Free-text search across catalog integration title and integrationName. ' +
          'Returns matching integrationName values; call again with `integration` for full connection docs.',
      ),
    integration: z
      .string()
      .optional()
      .describe(
        'Exact catalog integrationName (for example `salesforce`). Returns connection steps, ' +
          'datapoints, and supported actions from the signed-in organization catalog.',
      ),
  })
  .superRefine((value, ctx) => {
    const query = value.query?.trim();
    const integration = value.integration?.trim();
    if (!query && !integration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pass `integration` for one catalog entry or `query` to search the catalog.',
      });
    }
    if (query && integration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pass only one of `integration` or `query`, not both.',
      });
    }
  });

export type DocsIntegrationLookupInput = z.infer<typeof DocsIntegrationLookupSchema>;

export function createDocsIntegrationLookupTool(clients: ToolClients) {
  const graphql = clients.graphql as DocsCatalogGraphqlClient;

  return defineTool({
    name: 'docs_integration_lookup',
    description:
      'Signed-in integration catalog docs: connection steps, datapoints, and supported actions. ' +
      'Use `integration` for one entry or `query` to search. For public how-to guides on ' +
      'docs.transcend.io, use docs_list with the same integration name.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsIntegrationLookupSchema,
    handler: async ({ query, integration }) => {
      const integrationName = integration?.trim();
      if (integrationName) {
        if (!graphql.getCatalogIntegrationDetail) {
          throw new ToolError(
            ErrorCode.API_ERROR,
            'Catalog GraphQL client is missing getCatalogIntegrationDetail.',
          );
        }
        const catalog = await graphql.getCatalogIntegrationDetail(integrationName);
        const markdown = formatCatalogIntegrationMarkdown(catalog);
        return createToolResult(true, {
          integrationName: catalog.integrationName,
          title: catalog.title,
          markdown,
          publicGuideUrl: INTEGRATION_PRIMARY_GUIDE_URL[catalog.integrationName],
        });
      }

      const text = query?.trim();
      if (!text) {
        throw new ToolError(ErrorCode.VALIDATION_ERROR, 'query was empty after trimming.');
      }
      if (!graphql.listCatalogs) {
        throw new ToolError(ErrorCode.API_ERROR, 'Catalog GraphQL client is missing listCatalogs.');
      }

      const result = await graphql.listCatalogs({ first: SEARCH_PAGE_SIZE, offset: 0, text });
      const nodes = result.nodes.map((node) => ({
        integrationName: node.integrationName,
        title: node.title,
        description: node.description,
        publicGuideUrl: INTEGRATION_PRIMARY_GUIDE_URL[node.integrationName],
      }));

      return createListResult(nodes, {
        totalCount: result.totalCount,
        paginationNote:
          'Catalog search only. Pass `integration` with an integrationName for connection docs. ' +
          'This does not list every integration in the product catalog.',
        ...(result.pageInfo?.hasNextPage && {
          paginationNote:
            `Showing ${nodes.length} of ${result.totalCount} catalog matches. Narrow \`query\`, then ` +
            'call with `integration`.',
        }),
      });
    },
  });
}

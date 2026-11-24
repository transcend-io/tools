import {
  createToolResult,
  defineTool,
  McpToolErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DocsCatalogGraphqlClient } from '../catalogGraphql.js';
import { getRouteIndex } from '../docsIndex.js';
import { primaryIntegrationGuideUrl } from '../docsRoutes.js';
import { formatCatalogIntegrationMarkdown } from '../formatCatalogMarkdown.js';

/** Catalog rows fetched when resolving a name that is not an exact `integrationName`. */
const RESOLVE_PAGE_SIZE = 25;
/** Close names listed in the error for a name that matches nothing exactly. */
const SUGGESTION_LIMIT = 5;

export const DocsIntegrationLookupSchema = z.object({
  integration: z
    .string()
    .trim()
    .min(1, 'integration was empty. Pass a catalog integrationName such as `salesforce`.')
    .describe(
      'Catalog integrationName (e.g. `salesforce`) or title. Near miss returns close names.',
    ),
});

export type DocsIntegrationLookupInput = z.infer<typeof DocsIntegrationLookupSchema>;

/**
 * Resolves a caller-supplied name to catalog rows when it is not an exact
 * `integrationName`. Returns the single exact title or name match (ignoring case),
 * or the closest names to suggest.
 */
async function resolveIntegrationName(
  graphql: DocsCatalogGraphqlClient,
  input: string,
): Promise<{ match?: string; suggestions: string[] }> {
  const rows = await graphql.searchCatalogIntegrations(input, RESOLVE_PAGE_SIZE);
  const wanted = input.toLowerCase();
  const exact = rows.filter(
    (row) => row.integrationName.toLowerCase() === wanted || row.title.toLowerCase() === wanted,
  );
  if (exact.length === 1) {
    return { match: exact[0]!.integrationName, suggestions: [] };
  }
  return {
    suggestions: rows.slice(0, SUGGESTION_LIMIT).map((row) => row.integrationName),
  };
}

export function createDocsIntegrationLookupTool(clients: ToolClients) {
  const graphql = clients.graphql as DocsCatalogGraphqlClient;

  return defineTool({
    name: 'docs_integration_lookup',
    description:
      'Signed-in catalog docs for one integration (connection, datapoints, actions). Pass ' +
      'integrationName or title; near miss returns close names. Public guides: docs_list.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsIntegrationLookupSchema,
    handler: async ({ integration }) => {
      let catalog;
      try {
        catalog = await graphql.getCatalogIntegrationDetail(integration);
      } catch (error) {
        // The name may be a title or a miscased integrationName. Search the catalog before
        // giving up. If the search also fails, or finds nothing new, the first error stands.
        const { match, suggestions } = await resolveIntegrationName(graphql, integration).catch(
          () => ({ match: undefined, suggestions: [] as string[] }),
        );
        if (match && match !== integration) {
          catalog = await graphql.getCatalogIntegrationDetail(match);
        } else if (suggestions.length > 0) {
          throw new ToolError(
            McpToolErrorCode.ValidationError,
            `No catalog integration named '${integration}'. Close names: ` +
              `${suggestions.join(', ')}. Call again with one of them.`,
          );
        } else {
          throw error;
        }
      }

      let publicGuideUrl: string | undefined;
      try {
        publicGuideUrl = primaryIntegrationGuideUrl(await getRouteIndex(), catalog.integrationName);
      } catch {
        // Omit when the public route index is unavailable or not deployed yet.
      }

      return createToolResult(true, {
        integrationName: catalog.integrationName,
        title: catalog.title,
        markdown: formatCatalogIntegrationMarkdown(catalog, { publicGuideUrl }),
        ...(publicGuideUrl && { publicGuideUrl }),
      });
    },
  });
}

import {
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import { findManifestPage, getDashboardLinkManifest } from '../dashboardLinkManifest.js';
import { normalizeRoute, routeParamNames, toDashboardLink } from '../docsRoutes.js';

export const DocsDashboardLinkSchema = z.object({
  route: z
    .string()
    .describe(
      'Admin Dashboard route pattern or path. Omit filters to list available filter keys from the manifest.',
    ),
  filters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .optional()
    .describe('Values for the filters JSON query param.'),
  page: z.number().int().min(1).optional().describe('Pagination page index when supported.'),
  sort: z.string().optional().describe('JSON sort state when the page supports sort in the URL.'),
});
export type DocsDashboardLinkInput = z.infer<typeof DocsDashboardLinkSchema>;

function buildQuery(
  page: ReturnType<typeof findManifestPage>,
  input: DocsDashboardLinkInput,
): URLSearchParams {
  const params = new URLSearchParams();
  if (input.filters && Object.keys(input.filters).length > 0) {
    params.set('filters', JSON.stringify(input.filters));
  }
  if (input.page !== undefined && page?.pagination) {
    params.set('page', String(input.page));
  }
  if (input.sort !== undefined && page?.sort) {
    params.set('sort', input.sort);
  }
  return params;
}

export function createDocsDashboardLinkTool(_clients?: ToolClients) {
  return defineTool({
    name: 'docs_dashboard_link',
    description:
      'Build app.transcend.io URLs for list pages; route alone lists manifest filter keys.',
    category: 'Documentation',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: DocsDashboardLinkSchema,
    handler: async (input) => {
      let path: string;
      try {
        path = normalizeRoute(input.route);
      } catch (error) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          error instanceof Error ? error.message : String(error),
        );
      }

      const link = toDashboardLink(path);
      const requiredParams = routeParamNames(path);
      if (requiredParams.length > 0) {
        return createToolResult(true, {
          route: path,
          requiredParams,
          note: 'This route needs path parameters before it can open. Resolve IDs with signed-in MCP tools.',
        });
      }

      const manifest = await getDashboardLinkManifest();
      const manifestPage = manifest ? findManifestPage(manifest, path) : undefined;

      if (
        manifestPage &&
        (!input.filters || Object.keys(input.filters).length === 0) &&
        input.page === undefined &&
        input.sort === undefined
      ) {
        return createToolResult(true, {
          route: manifestPage.route,
          title: manifestPage.title,
          filters: manifestPage.filters,
          params: manifestPage.params,
          sort: manifestPage.sort,
          pagination: manifestPage.pagination,
          url: link.url,
        });
      }

      const query = buildQuery(manifestPage, input);
      const url = query.size > 0 ? `${link.url}?${query.toString()}` : link.url;
      return createToolResult(true, {
        route: path,
        url,
        ...(manifestPage && { title: manifestPage.title }),
      });
    },
  });
}

import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

import type { DSRMixin } from '../graphql.js';

export const listRequestDataSilosSchema = OffsetPaginationSchema.extend({
  requestId: z.string().describe('ID of the Data Subject Request whose connected systems to list'),
  status: z
    .array(z.string())
    .optional()
    .describe(
      'Optional filter by request-data-silo status values (e.g. ERROR, RESOLVED, WAITING, ACTION_REQUIRED). ' +
        'Use ERROR to find failed systems.',
    ),
  visualStatus: z
    .string()
    .optional()
    .describe(
      'Optional filter by a single visual status, including WAITING_ON_DEPENDENCIES, ' +
        'DATA_SILO_DISCONNECTED, DATA_SILO_PAUSED, MANUAL, etc.',
    ),
  text: z
    .string()
    .optional()
    .describe('Optional free-text filter on the connected data silo title'),
});
export type ListRequestDataSilosInput = z.infer<typeof listRequestDataSilosSchema>;

export function createDsrListRequestDataSilosTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_list_request_data_silos',
    description:
      'List connected data systems (request data silos) for a Data Subject Request, including each ' +
      "system's processing status, error message when failed, and the responsible system owners and teams. " +
      'Use this to diagnose approval or compilation bottlenecks caused by failed or stalled systems. ' +
      'Filter with status=["ERROR"] for failures. Paginate with offset until hasNextPage is false.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: listRequestDataSilosSchema,
    handler: async ({ requestId, status, visualStatus, text, first, offset }) => {
      const result = await graphql.listRequestDataSilos({
        requestId,
        status,
        visualStatus,
        text,
        first,
        offset,
      });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}

import {
  createToolResult,
  defineTool,
  envelopeSchema,
  groupBy,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

import type { DSRMixin } from '../graphql.js';

export const analyzeDsrSchema = z.object({
  days: z.coerce
    .number()
    .optional()
    .describe(
      'Filter analysis to requests within N days (default: 30). Only analyzes from the 100 most recent requests.',
    ),
});
export type AnalyzeDsrInput = z.infer<typeof analyzeDsrSchema>;

export function createDsrAnalyzeTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_analyze',
    description:
      'Summarize the 100 most recent DSRs: counts by type and status, completion rate, and a configurable recent-days window (default 30). For full-fleet analytics, page through dsr_list and aggregate yourself.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: analyzeDsrSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        summary: z.object({
          analyzedRequests: z.number(),
          totalRequestsInSystem: z.number().optional(),
          recentRequests: z.number(),
          completedRequests: z.number(),
          pendingRequests: z.number(),
          completionRate: z.number(),
        }),
        breakdown: z.object({
          byType: z.record(z.string(), z.number()),
          byStatus: z.record(z.string(), z.number()),
          recentByType: z.record(z.string(), z.number()),
          recentByStatus: z.record(z.string(), z.number()),
        }),
        period: z.object({
          days: z.number(),
          startDate: z.string(),
          endDate: z.string(),
        }),
        limitation: z.string().optional(),
      }),
    ),
    handler: async ({ days }) => {
      const result = await graphql.listRequests({ first: 100 });
      const requests = result.nodes;
      const periodDays = days ?? 30;
      const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

      const recentRequests = requests.filter((r) => new Date(r.createdAt) > cutoffDate);
      const completedRequests = requests.filter((r) => r.status === 'COMPLETED');
      const pendingRequests = requests.filter((r) =>
        [
          'REQUEST_MADE',
          'ENRICHING',
          'ON_HOLD',
          'WAITING',
          'COMPILING',
          'APPROVING',
          'DELAYED',
          'SECONDARY',
          'SECONDARY_APPROVING',
        ].includes(r.status),
      );

      return createToolResult(true, {
        summary: {
          analyzedRequests: requests.length,
          totalRequestsInSystem: result.totalCount,
          recentRequests: recentRequests.length,
          completedRequests: completedRequests.length,
          pendingRequests: pendingRequests.length,
          completionRate:
            requests.length > 0
              ? Math.round((completedRequests.length / requests.length) * 100)
              : 0,
        },
        breakdown: {
          byType: groupBy(requests, 'type'),
          byStatus: groupBy(requests, 'status'),
          recentByType: groupBy(recentRequests, 'type'),
          recentByStatus: groupBy(recentRequests, 'status'),
        },
        period: {
          days: periodDays,
          startDate: cutoffDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        limitation:
          (result.totalCount || 0) > 100
            ? `This analysis is based on the 100 most recent requests out of ${result.totalCount} total. For complete analysis, use dsr_list with pagination to fetch all requests.`
            : undefined,
      });
    },
  });
}

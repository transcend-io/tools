import {
  createListResult,
  defineTool,
  describeNoMatches,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export const ListTemplatesSchema = OffsetPaginationSchema.extend({
  text: z.string().optional().describe('Free-text match on the template title and description'),
  ids: z
    .array(z.string())
    .min(1, { message: 'Pass at least one template ID, or omit the filter entirely.' })
    .optional()
    .describe('Specific template IDs to fetch'),
  statuses: z
    .array(z.enum(['DRAFT', 'PUBLISHED']))
    .min(1, { message: 'Pass at least one status, or omit the filter entirely.' })
    .optional()
    .describe('Publication statuses to include. Omit for both.'),
});
export type ListTemplatesInput = z.infer<typeof ListTemplatesSchema>;

export function createAssessmentsListTemplatesTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_list_templates',
    description: 'List the blank assessment templates available to build new assessments from.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListTemplatesSchema,
    handler: async ({ limit, offset, text, ids, statuses }) => {
      const result = await graphql.listAssessmentTemplates({
        first: limit,
        offset,
        filterBy: {
          ...(text && { text }),
          ...(ids?.length && { ids }),
          ...(statuses?.length && { statuses }),
        },
      });

      const appliedFilters = Object.entries({
        text,
        ids: ids?.length,
        statuses: statuses?.length,
      })
        .filter(([, value]) => Boolean(value))
        .map(([name]) => name);

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        ...(result.totalCount === 0 && {
          paginationNote: describeNoMatches('templates', appliedFilters),
        }),
      });
    },
  });
}

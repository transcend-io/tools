import {
  assertOffsetInRange,
  createListResult,
  defineTool,
  describeOutcome,
  nonEmptyList,
  nonEmptyListMessage,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export const ListTemplatesSchema = OffsetPaginationSchema.extend({
  text: z.string().optional().describe('Free-text match on the template title and description'),
  ids: nonEmptyList('Specific template IDs to fetch', 'template ID'),
  statuses: z
    .array(z.enum(['DRAFT', 'PUBLISHED']))
    .min(1, { message: nonEmptyListMessage('status') })
    .optional()
    .describe('Publication statuses to include. Omit for both.'),
});
export type ListTemplatesInput = z.infer<typeof ListTemplatesSchema>;

export function createAssessmentsListTemplatesTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_list_templates',
    description:
      'List the blank assessment templates. Only `PUBLISHED` ones can build new assessments.',
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

      const totalCount = result.totalCount ?? 0;
      assertOffsetInRange({ subject: 'template', offset, totalCount, appliedFilters });

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
        paginationNote: describeOutcome({
          subject: 'templates',
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

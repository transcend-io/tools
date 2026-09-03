import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export const ListTemplatesSchema = OffsetPaginationSchema.extend({
  text: z.string().optional().describe('Free-text match on the template title'),
  ids: z.array(z.string()).optional().describe('Specific template IDs to fetch'),
  statuses: z
    .array(z.enum(['DRAFT', 'PUBLISHED']))
    .optional()
    .describe('Publication statuses to include. Omit for both.'),
});
export type ListTemplatesInput = z.infer<typeof ListTemplatesSchema>;

export function createAssessmentsListTemplatesTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_list_templates',
    description:
      'Find blank assessment templates, the starting points new assessments are built from. ' +
      'Narrow with `text` rather than scanning pages, then use the returned `id` as ' +
      '`templateId` for `assessments_export_template` to read the questions, or for ' +
      '`assessments_create`.',
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

      return createListResult(result.nodes, {
        totalCount: result.totalCount,
        hasNextPage: result.pageInfo?.hasNextPage,
      });
    },
  });
}

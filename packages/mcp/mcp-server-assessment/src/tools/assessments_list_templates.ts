import {
  createListResult,
  defineTool,
  OffsetPaginationSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { describeNoMatches } from '../helpers/describeNoMatches.js';

/**
 * Three-query test. An agent holding only the tool list should land here, and
 * only here, for each of these:
 *
 * 1. "What's the ID of the vendor risk template?"
 *    Reaches `text`. This is the tool's main job: resolving a template a person
 *    named into an id that `assessments_list`, `assessments_export_template`
 *    and `assessments_create` all take.
 *
 * 2. "Which templates are still drafts?"
 *    Reaches `statuses`, and reads `status` back off the row.
 *
 * 3. "Which of our templates are new?"
 *    Reaches nothing, and that is the point: the API offers no date filter or
 *    sort, so the row carries a real `createdAt` to rank by. It used to carry
 *    the time of the call, which made this question unanswerable while looking
 *    answerable.
 */

export const ListTemplatesSchema = OffsetPaginationSchema.extend({
  text: z.string().optional().describe('Free-text match on the template title and description'),
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
      'Narrow with `text` rather than scanning pages. Use the returned `id` as `templateId` ' +
      'for `assessments_export_template` to read the questions, for `assessments_create`, or ' +
      'to filter `assessments_list` down to the forms built from it. Each row has id, title, ' +
      'description, status, source, isArchived, createdAt and updatedAt. No date filter or ' +
      'sort exists, so rank by createdAt yourself when asked which are new.',
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

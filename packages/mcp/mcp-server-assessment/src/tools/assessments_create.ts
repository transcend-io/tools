import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

export const CreateAssessmentSchema = z.object({
  title: z.string().describe('Title of the assessment'),
  assessmentGroupId: z
    .string()
    .describe(
      'Group to create the assessment in. Find it by name with assessments_list_groups. If no ' +
        'group is built from the template you want, create one with assessments_create_group ' +
        'rather than guessing at an existing group.',
    ),
  assigneeIds: z
    .array(z.string())
    .optional()
    .describe(
      'User IDs to assign the assessment to. Assign here rather than later: a new form is DRAFT, ' +
        'and a DRAFT form rejects answers. Assigning it moves it to SHARED, where it can be answered.',
    ),
});
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

export function createAssessmentsCreateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_create',
    description:
      'Create a new privacy assessment inside an assessment group, resolved by name through ' +
      'assessments_list_groups. ' +
      'Surface the returned `url` verbatim; never build assessment URLs from IDs.',
    category: 'Assessments',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateAssessmentSchema,
    handler: async ({ title, assessmentGroupId, assigneeIds }) => {
      const result = await graphql.createAssessment({
        title,
        assessmentGroupId,
        assigneeIds,
      });

      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id });

      return createToolResult(true, {
        assessment: { ...result, ...links },
        ...links,
        message: `Assessment "${title}" created successfully. Open it at ${links.url}`,
      });
    },
  });
}

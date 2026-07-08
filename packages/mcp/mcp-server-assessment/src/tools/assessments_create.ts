import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';
import { resolveTemplateToGroupId } from './_helpers.js';

export const CreateAssessmentSchema = z.object({
  title: z.string().describe('Title of the assessment'),
  assessmentGroupId: z
    .string()
    .optional()
    .describe(
      'ID of the assessment group to create the assessment in (preferred). Use assessments_list_groups to find available groups.',
    ),
  templateId: z
    .string()
    .optional()
    .describe(
      'ID of the assessment template. If assessmentGroupId is not provided, the first group using this template will be used.',
    ),
  assigneeIds: z
    .array(z.string())
    .optional()
    .describe('Array of user IDs to assign the assessment to'),
});
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

export function createAssessmentsCreateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_create',
    description:
      'Create a new privacy assessment within an assessment group. Assessment groups are linked to templates. You can provide either an assessmentGroupId directly, or a templateId to auto-resolve the first matching group. Use assessments_list_groups to find available groups. The response includes a `url` field with the canonical admin-dashboard link — surface that to the user verbatim and do not construct assessment URLs from raw IDs.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new privacy assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateAssessmentSchema,
    handler: async ({ title, assessmentGroupId, templateId, assigneeIds }) => {
      let resolvedAssessmentGroupId = assessmentGroupId;

      if (!resolvedAssessmentGroupId && templateId) {
        const resolved = await resolveTemplateToGroupId(graphql, templateId);
        if ('error' in resolved) return resolved.error;
        resolvedAssessmentGroupId = resolved.groupId;
      }

      if (!resolvedAssessmentGroupId) {
        return createToolResult(
          false,
          undefined,
          'Either assessmentGroupId or templateId must be provided. Use assessments_list_groups to find available groups.',
        );
      }

      const result = await graphql.createAssessment({
        title,
        assessmentGroupId: resolvedAssessmentGroupId,
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

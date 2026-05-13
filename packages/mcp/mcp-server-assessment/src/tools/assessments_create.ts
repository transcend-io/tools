import {
  AssessmentSchema,
  createToolResult,
  defineTool,
  envelopeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { resolveTemplateToGroupId } from './_helpers.js';

export const CreateAssessmentSchema = z.object({
  title: z.string().describe('Title of the assessment'),
  assessment_group_id: z
    .string()
    .optional()
    .describe(
      'ID of the assessment group to create the assessment in (preferred). Use assessments_list_groups to find available groups.',
    ),
  template_id: z
    .string()
    .optional()
    .describe(
      'ID of the assessment template. If assessment_group_id is not provided, the first group using this template will be used.',
    ),
  assignee_ids: z
    .array(z.string())
    .optional()
    .describe('Array of user IDs to assign the assessment to'),
});
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

export function createAssessmentsCreateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_create',
    description:
      'Create a new privacy assessment within an assessment group. Assessment groups are linked to templates. You can provide either an assessment_group_id directly, or a template_id to auto-resolve the first matching group. Use assessments_list_groups to find available groups.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new privacy assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateAssessmentSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        assessment: AssessmentSchema,
        message: z.string(),
      }),
    ),
    handler: async ({ title, assessment_group_id, template_id, assignee_ids }) => {
      let assessmentGroupId = assessment_group_id;

      if (!assessmentGroupId && template_id) {
        const resolved = await resolveTemplateToGroupId(graphql, template_id);
        if ('error' in resolved) return resolved.error;
        assessmentGroupId = resolved.groupId;
      }

      if (!assessmentGroupId) {
        return createToolResult(
          false,
          undefined,
          'Either assessment_group_id or template_id must be provided. Use assessments_list_groups to find available groups.',
        );
      }

      const result = await graphql.createAssessment({
        title,
        assessmentGroupId,
        assigneeIds: assignee_ids,
      });

      return createToolResult(true, {
        assessment: result,
        message: `Assessment "${title}" created successfully`,
      });
    },
  });
}

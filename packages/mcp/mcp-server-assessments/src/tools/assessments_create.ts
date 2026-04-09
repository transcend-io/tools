import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { resolveTemplateToGroupId } from './_helpers.js';

const CreateAssessmentSchema = z.object({
  title: z.string(),
  assessment_group_id: z.string().optional(),
  template_id: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
});

export function createAssessmentsCreateTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_create',
    description:
      'Create a new privacy assessment within an assessment group. Assessment groups are linked to templates. You can provide either an assessment_group_id directly, or a template_id to auto-resolve the first matching group. Use assessments_list_groups to find available groups.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new privacy assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateAssessmentSchema,
    handler: async (args: z.infer<typeof CreateAssessmentSchema>) => {
      try {
        let assessmentGroupId = args.assessment_group_id;

        if (!assessmentGroupId && args.template_id) {
          const resolved = await resolveTemplateToGroupId(graphql, args.template_id);
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
          title: args.title,
          assessmentGroupId,
          assigneeIds: args.assignee_ids,
        });

        return createToolResult(true, {
          assessment: result,
          message: `Assessment "${args.title}" created successfully`,
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}

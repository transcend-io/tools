import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { CreateAssessmentSchema } from '../schemas.js';
import { resolveTemplateToGroupId } from './_helpers.js';

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
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the assessment',
        },
        assessment_group_id: {
          type: 'string',
          description:
            'ID of the assessment group to create the assessment in (preferred). Use assessments_list_groups to find available groups.',
        },
        template_id: {
          type: 'string',
          description:
            'ID of the assessment template. If assessment_group_id is not provided, the first group using this template will be used.',
        },
        assignee_ids: {
          type: 'array',
          description: 'Array of user IDs to assign the assessment to',
          items: { type: 'string' },
        },
      },
      required: ['title'],
    },
    handler: async (args) => {
      const parsed = validateArgs(CreateAssessmentSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        let assessmentGroupId = parsed.data.assessment_group_id;

        if (!assessmentGroupId && parsed.data.template_id) {
          const resolved = await resolveTemplateToGroupId(graphql, parsed.data.template_id);
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
          title: parsed.data.title,
          assessmentGroupId,
          assigneeIds: parsed.data.assignee_ids,
        });

        return createToolResult(true, {
          assessment: result,
          message: `Assessment "${parsed.data.title}" created successfully`,
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

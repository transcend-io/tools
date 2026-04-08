import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { CreateGroupSchema } from '../schemas.js';

export function createAssessmentsCreateGroupTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_create_group',
    description:
      'Create a new assessment group linked to a template. Assessment groups are containers for assessments.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new assessment group',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the assessment group',
        },
        template_id: {
          type: 'string',
          description: 'ID of the assessment template to link this group to',
        },
        description: {
          type: 'string',
          description: 'Description of the assessment group (optional)',
        },
        reviewer_ids: {
          type: 'array',
          description: 'IDs of users assigned to review new assessments in this group (optional)',
          items: { type: 'string' },
        },
      },
      required: ['title', 'template_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(CreateGroupSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.createAssessmentGroup({
          title: parsed.data.title,
          assessmentFormTemplateId: parsed.data.template_id,
          description: parsed.data.description,
          reviewerIds: parsed.data.reviewer_ids,
        });

        return createToolResult(true, {
          assessmentGroup: result,
          message: `Assessment group "${parsed.data.title}" created successfully`,
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

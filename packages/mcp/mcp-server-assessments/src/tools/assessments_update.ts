import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { UpdateAssessmentSchema } from '../schemas.js';

export function createAssessmentsUpdateTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_update',
    description: 'Update an existing assessment',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Updates the assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        assessment_id: {
          type: 'string',
          description: 'ID of the assessment to update',
        },
        title: {
          type: 'string',
          description: 'New title for the assessment',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
        reviewer_ids: {
          type: 'array',
          description: 'IDs of users assigned to review this assessment',
          items: { type: 'string' },
        },
        due_date: {
          type: 'string',
          description: 'New due date (ISO format)',
        },
        status: {
          type: 'string',
          description: 'New status',
          enum: [
            'DRAFT',
            'SHARED',
            'IN_PROGRESS',
            'IN_REVIEW',
            'CHANGES_REQUESTED',
            'REJECTED',
            'APPROVED',
          ],
        },
      },
      required: ['assessment_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateAssessmentSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.updateAssessment({
          id: parsed.data.assessment_id,
          title: parsed.data.title,
          description: parsed.data.description,
          reviewerIds: parsed.data.reviewer_ids,
          dueDate: parsed.data.due_date,
          status: parsed.data.status,
        });

        return createToolResult(true, {
          assessment: result,
          message: 'Assessment updated successfully',
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

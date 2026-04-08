import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { UpdateAssigneesSchema } from '../schemas.js';

export function createAssessmentsUpdateAssigneesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_update_assignees',
    description:
      'Assign internal users (by ID) or external users (by email) to an assessment form. This also transitions DRAFT assessments to SHARED status.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Assigns users to the assessment form',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        assessment_id: {
          type: 'string',
          description: 'ID of the assessment form to update assignees for',
        },
        assignee_ids: {
          type: 'array',
          description: 'Array of internal user IDs to assign to the assessment',
          items: { type: 'string' },
        },
        external_assignee_emails: {
          type: 'array',
          description: 'Array of external email addresses to assign to the assessment',
          items: { type: 'string' },
        },
      },
      required: ['assessment_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateAssigneesSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.updateAssessmentFormAssignees({
          id: parsed.data.assessment_id,
          assigneeIds: parsed.data.assignee_ids,
          externalAssigneeEmails: parsed.data.external_assignee_emails,
        });

        return createToolResult(true, {
          assessment: result,
          message: `Assessment assignees updated successfully. Status: ${result.status}`,
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

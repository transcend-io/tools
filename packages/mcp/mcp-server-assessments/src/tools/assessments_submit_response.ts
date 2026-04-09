import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { SubmitResponseSchema } from '../schemas.js';

export function createAssessmentsSubmitResponseTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_submit_response',
    description:
      'Submit an assessment form for review. Optionally specify which sections to submit. This transitions the assessment toward the IN_REVIEW status.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Submits assessment for review — cannot be undone',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        assessment_id: {
          type: 'string',
          description: 'ID of the assessment to submit for review',
        },
        assessment_section_ids: {
          type: 'array',
          description: 'Array of section IDs to submit for review. Required by the API.',
          items: { type: 'string' },
        },
      },
      required: ['assessment_id', 'assessment_section_ids'],
    },
    handler: async (args) => {
      const parsed = validateArgs(SubmitResponseSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.submitAssessmentForReview({
          id: parsed.data.assessment_id,
          assessmentSectionIds: parsed.data.assessment_section_ids,
        });

        return createToolResult(true, {
          assessment: result,
          message: 'Assessment submitted for review successfully',
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

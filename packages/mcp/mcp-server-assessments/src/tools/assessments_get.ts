import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { GetAssessmentSchema } from '../schemas.js';

export function createAssessmentsGetTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_get',
    description:
      'Get detailed information about a specific assessment including questions and responses',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        assessment_id: {
          type: 'string',
          description: 'ID of the assessment to retrieve',
        },
      },
      required: ['assessment_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(GetAssessmentSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.getAssessment(parsed.data.assessment_id);
        return createToolResult(true, result);
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

import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const GetAssessmentSchema = z.object({
  assessment_id: z.string().describe('ID of the assessment to retrieve'),
});

export function createAssessmentsGetTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_get',
    description:
      'Get detailed information about a specific assessment including questions and responses',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    handler: async ({ assessment_id }) => {
      try {
        const result = await graphql.getAssessment(assessment_id);
        return createToolResult(true, result);
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}

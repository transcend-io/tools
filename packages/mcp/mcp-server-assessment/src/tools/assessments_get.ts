import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export const GetAssessmentSchema = z.object({
  assessment_id: z.string().describe('ID of the assessment to retrieve'),
  assessment_name: z
    .string()
    .optional()
    .describe(
      'Optional human-readable name (e.g. title) for the tool call in chat; not sent to the API.',
    ),
});
export type GetAssessmentInput = z.infer<typeof GetAssessmentSchema>;

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
      const result = await graphql.getAssessment(assessment_id);
      return createToolResult(true, result);
    },
  });
}

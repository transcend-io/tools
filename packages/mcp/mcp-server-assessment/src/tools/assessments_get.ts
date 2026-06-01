import {
  AssessmentSchema,
  createToolResult,
  defineTool,
  envelopeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

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
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_get',
    description:
      'Get detailed information about a specific assessment including questions and responses. The response includes a `url` field with the canonical admin-dashboard link — surface that to the user verbatim and do not construct assessment URLs from raw IDs.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetAssessmentSchema,
    outputZodSchema: envelopeSchema(AssessmentSchema),
    handler: async ({ assessment_id }) => {
      const result = await graphql.getAssessment(assessment_id);
      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: result.id });
      return createToolResult(true, { ...result, ...links });
    },
  });
}

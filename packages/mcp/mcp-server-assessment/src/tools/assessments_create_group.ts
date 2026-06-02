import {
  AssessmentGroupSchema,
  createToolResult,
  defineTool,
  envelopeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentGroupUrl } from '../helpers/buildAssessmentLinks.js';

export const CreateGroupSchema = z.object({
  title: z.string().describe('Title of the assessment group'),
  template_id: z.string().describe('ID of the assessment template to link this group to'),
  description: z.string().optional().describe('Description of the assessment group (optional)'),
  reviewer_ids: z
    .array(z.string())
    .optional()
    .describe('IDs of users assigned to review new assessments in this group (optional)'),
});
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;

export function createAssessmentsCreateGroupTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_create_group',
    description:
      'Create a new assessment group linked to a template. Assessment groups are containers for assessments. The response includes a `groupUrl` field with the canonical admin-dashboard link to the group — surface that to the user verbatim.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new assessment group',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateGroupSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        assessmentGroup: AssessmentGroupSchema,
        message: z.string(),
      }),
    ),
    handler: async ({ title, template_id, description, reviewer_ids }) => {
      const result = await graphql.createAssessmentGroup({
        title,
        assessmentFormTemplateId: template_id,
        description,
        reviewerIds: reviewer_ids,
      });

      const groupUrl = buildAssessmentGroupUrl(dashboardUrl, result.id);

      return createToolResult(true, {
        assessmentGroup: { ...result, groupUrl },
        groupUrl,
        message: `Assessment group "${title}" created successfully. View it at ${groupUrl}`,
      });
    },
  });
}

import { ASSESSMENT_CREATE_FORM_RESOURCE_URI } from '@transcend-io/mcp-app-assessment-create-form';
import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';
import {
  updatePendingCreateSuggestions,
  waitForCreateConfirmation,
} from '../pending-create-confirmation.js';
import { resolveCreateFormSuggestions } from './_createFormSuggestions.js';

export const CreateAssessmentSchema = z.object({
  suggested_title: z
    .string()
    .optional()
    .describe('Suggested title prepopulated in the create form UI'),
  suggested_assessment_group_id: z
    .string()
    .optional()
    .describe(
      'Suggested assessment group ID prepopulated in the create form UI. Use assessments_list_groups to find IDs.',
    ),
  suggested_assignee_id: z
    .string()
    .optional()
    .describe('Suggested assignee user ID prepopulated in the create form UI'),
  template_id: z
    .string()
    .optional()
    .describe(
      'Template ID used to derive a suggested assessment group when suggested_assessment_group_id is not provided.',
    ),
});
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

export function createAssessmentsCreateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_create',
    description:
      'Create a new privacy assessment. Always opens a create form UI (title, assessment group, assignee) and does not return until the user confirms. ' +
      'Pass suggested_title, suggested_assessment_group_id, and suggested_assignee_id as optional hints to prepopulate the form. ' +
      'Use assessments_list_groups to find group IDs. template_id can derive a suggested group when no group suggestion is provided. ' +
      'The response includes a `url` field with the canonical admin-dashboard link — surface that to the user verbatim and do not construct assessment URLs from raw IDs.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new privacy assessment',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateAssessmentSchema,
    ui: { resourceUri: ASSESSMENT_CREATE_FORM_RESOURCE_URI },
    handler: async (input) => {
      const confirmedPromise = waitForCreateConfirmation({
        suggestedTitle: input.suggested_title,
        suggestedAssessmentGroupId: input.suggested_assessment_group_id,
        suggestedAssigneeId: input.suggested_assignee_id,
        operation: 'create',
      });

      void resolveCreateFormSuggestions(graphql, input).then((suggestions) => {
        updatePendingCreateSuggestions(suggestions);
      });

      const confirmed = await confirmedPromise;

      const created = await graphql.createAssessment({
        title: confirmed.title,
        assessmentGroupId: confirmed.assessmentGroupId,
      });

      const assigned = await graphql.updateAssessmentFormAssignees({
        id: created.id,
        assigneeIds: confirmed.assigneeIds,
      });
      const assessment = { ...created, ...assigned };

      const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: assessment.id });

      return createToolResult(true, {
        assessment: { ...assessment, ...links },
        ...links,
        message: `Assessment "${confirmed.title}" created successfully. Open it at ${links.url}`,
      });
    },
  });
}

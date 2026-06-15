import { ASSESSMENT_CREATE_FORM_RESOURCE_URI } from '@transcend-io/mcp-app-assessment-create-form';
import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';
import {
  updatePendingCreateSuggestions,
  waitForCreateConfirmation,
} from '../pending-create-confirmation.js';
import { resolveCreateFormSuggestions } from './_createFormSuggestions.js';
import { runPrefillContinuation } from './_prefillContinuation.js';

export const PrefillSchema = z.object({
  suggested_title: z
    .string()
    .optional()
    .describe('Suggested title prepopulated in the create form UI'),
  template_id: z
    .string()
    .optional()
    .describe(
      'Template ID used to derive a suggested assessment group when suggested_assessment_group_id is not provided.',
    ),
  suggested_assessment_group_id: z
    .string()
    .optional()
    .describe('Suggested assessment group ID prepopulated in the create form UI'),
  answers: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .describe(
      'Map of answers keyed by question title or referenceId. Values should be strings for text/single-select, or arrays of strings for multi-select.',
    ),
  suggested_assignee_id: z
    .string()
    .optional()
    .describe('Suggested assignee user ID prepopulated in the create form UI'),
  reviewer_ids: z.array(z.string()).optional().describe('User IDs to set as reviewers (optional)'),
  submit_for_review: z
    .boolean()
    .optional()
    .describe(
      'Whether to automatically submit the form for review after prefilling (default: false)',
    ),
});
export type PrefillInput = z.infer<typeof PrefillSchema>;

export function createAssessmentsPrefillTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_prefill',
    description:
      'Convenience tool: Create a new assessment form, AI-prefill all the answers, and assign it to a reviewer. ' +
      'Always opens a create form UI (title, assessment group, assignee) and does not return until the user confirms. ' +
      'Pass suggested_title, suggested_assessment_group_id, and suggested_assignee_id as optional hints to prepopulate the form. ' +
      'Provide answers as a map of {questionTitle: answer} or {referenceId: answer}. ' +
      'For SINGLE_SELECT/MULTI_SELECT, the answer should match the exact text of the answer option(s). ' +
      'For text questions, provide the free-text answer string. ' +
      'For multi-select, provide an array of answer option values.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates assessment, prefills answers, assigns reviewers',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: PrefillSchema,
    ui: { resourceUri: ASSESSMENT_CREATE_FORM_RESOURCE_URI },
    handler: async ({
      answers,
      suggested_title,
      suggested_assessment_group_id,
      template_id,
      suggested_assignee_id,
      reviewer_ids,
      submit_for_review,
    }) => {
      const confirmedPromise = waitForCreateConfirmation({
        suggestedTitle: suggested_title,
        suggestedAssessmentGroupId: suggested_assessment_group_id,
        suggestedAssigneeId: suggested_assignee_id,
        operation: 'prefill',
        prefillPayload: {
          answers,
          reviewer_ids,
          submit_for_review,
        },
      });

      void resolveCreateFormSuggestions(graphql, {
        suggested_title,
        suggested_assessment_group_id,
        suggested_assignee_id,
        template_id,
      }).then((suggestions) => {
        updatePendingCreateSuggestions(suggestions);
      });

      const confirmed = await confirmedPromise;

      const created = await graphql.createAssessment({
        title: confirmed.title,
        assessmentGroupId: confirmed.assessmentGroupId,
      });
      const assessmentId = created.id;

      const fullForm = await graphql.getAssessment(assessmentId);
      if (!fullForm.sections || fullForm.sections.length === 0) {
        const links = buildAssessmentLinks({ dashboardUrl, assessmentFormId: assessmentId });
        await graphql.updateAssessmentFormAssignees({
          id: assessmentId,
          assigneeIds: confirmed.assigneeIds,
        });
        return createToolResult(true, {
          assessment: { ...fullForm, ...links },
          ...links,
          message: 'Assessment created but has no sections/questions to prefill.',
          answersApplied: 0,
        });
      }

      const continuation = await runPrefillContinuation(graphql, assessmentId, fullForm, {
        answers,
        assignee_ids: confirmed.assigneeIds,
        reviewer_ids,
        submit_for_review,
      });

      return createToolResult(true, {
        assessmentId,
        title: confirmed.title,
        answersApplied: continuation.answersApplied,
        answersSkipped: continuation.answersSkipped,
        totalQuestions: continuation.results.length,
        results: continuation.results,
        assignment: continuation.assignmentResult
          ? {
              status: continuation.assignmentResult.status,
              message: 'Assignees updated',
            }
          : null,
        submittedForReview: !!continuation.submitResult,
        message:
          `Assessment "${confirmed.title}" created and prefilled with ${continuation.answersApplied}/${continuation.results.length} answers. ` +
          (continuation.assignmentResult ? `Assigned to reviewers. ` : '') +
          (continuation.submitResult ? 'Submitted for review.' : 'Ready for manual submission.'),
      });
    },
  });
}

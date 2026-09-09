import {
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
  type Assessment,
  type AssessmentSection,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { resolveTemplateToGroupId } from './_helpers.js';

/**
 * Re-raise a failure from after the form was created, naming the form.
 *
 * This tool creates before it does anything else, so every later step fails
 * with a form already on the dashboard. A bare error names none of it, leaving
 * the caller no handle on what it made and no recovery but to create a second
 * one, which is how half-built duplicates end up in a group.
 *
 * @param assessmentId - The form that already exists
 * @param title - Its title, so the message reads without a second lookup
 * @param step - What was being attempted, phrased to follow "but "
 * @param error - The underlying failure
 * @throws ToolError naming the form and the step that failed
 */
function failWithFormId(assessmentId: string, title: string, step: string, error: unknown): never {
  throw new ToolError(
    ErrorCode.API_ERROR,
    `Assessment "${title}" was created but ${step} failed: ${
      error instanceof Error ? error.message : String(error)
    }. The form exists. Read it with assessments_get and finish it there rather than ` +
      'creating another.',
    false,
    { assessmentId, step },
  );
}

export const PrefillSchema = z.object({
  title: z.string().describe('Title for the new assessment form'),
  templateId: z
    .string()
    .optional()
    .describe(
      'Fallback for when no group is known. Lands the form in whichever group happens to be ' +
        'first among those built from this template, so never use it when the user named a group.',
    ),
  assessmentGroupId: z
    .string()
    .optional()
    .describe(
      'Group to create the form in (preferred). Resolve by name with `assessments_list_groups`.',
    ),
  answers: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .describe(
      'Map of answers keyed by question title or referenceId, both of which come from ' +
        'assessments_export_template on the template you are creating from. A string for text ' +
        'and single-select, an array for multi-select. Select answers must match the option ' +
        'text exactly.',
    ),
  assigneeIds: z
    .array(z.string())
    .optional()
    .describe(
      'Internal user IDs to assign before prefilling. Provide this or assigneeEmails so the form can leave DRAFT.',
    ),
  assigneeEmails: z
    .array(z.string())
    .optional()
    .describe(
      'External email addresses to assign before prefilling. Provide this or assigneeIds so the form can leave DRAFT.',
    ),
  reviewerIds: z.array(z.string()).optional().describe('User IDs to set as reviewers (optional)'),
  includeDetails: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, include one result row per question. Default false returns compact counts.',
    ),
  submitForReview: z
    .boolean()
    .optional()
    .describe(
      'Whether to automatically submit the form for review after prefilling (default: false)',
    ),
});
export type PrefillInput = z.infer<typeof PrefillSchema>;

export function createAssessmentsPrefillTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_prefill',
    description:
      'Create an assessment form, fill in the answers you supply, and assign it for review in ' +
      'one call. Combines: create form → assign it → read its questions → answer each → ' +
      'optionally submit. Requires assigneeIds or assigneeEmails: a form accepts no answers ' +
      'until it is assigned. The answers are yours to provide; nothing is generated for you.',
    category: 'Assessments',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: PrefillSchema,
    handler: async ({
      answers,
      title,
      assessmentGroupId,
      templateId,
      assigneeIds,
      assigneeEmails,
      reviewerIds,
      includeDetails,
      submitForReview,
    }) => {
      let resolvedAssessmentGroupId = assessmentGroupId;
      if (!resolvedAssessmentGroupId && templateId) {
        const resolved = await resolveTemplateToGroupId(graphql, templateId);
        if ('error' in resolved) return resolved.error;
        resolvedAssessmentGroupId = resolved.groupId;
      }
      if (!resolvedAssessmentGroupId) {
        return createToolResult(
          false,
          undefined,
          'Either templateId or assessmentGroupId is required.',
        );
      }
      if (!assigneeIds?.length && !assigneeEmails?.length) {
        return createToolResult(
          false,
          undefined,
          'Provide assigneeIds or assigneeEmails before prefilling. An assessment must be assigned so it can move from DRAFT to SHARED before answers move it to IN_PROGRESS.',
          {
            code: 'ASSESSMENT_PREFILL_ASSIGNEE_REQUIRED',
            retryable: false,
          },
        );
      }

      const assessment = await graphql.createAssessment({
        title,
        assessmentGroupId: resolvedAssessmentGroupId,
        assigneeIds,
      });
      const assessmentId = assessment.id;

      const assignmentResult = await graphql
        .updateAssessmentFormAssignees({
          id: assessmentId,
          assigneeIds,
          externalAssigneeEmails: assigneeEmails,
        })
        .catch((error) => failWithFormId(assessmentId, title, 'assigning it', error));

      if (reviewerIds) {
        await graphql
          .updateAssessment({
            id: assessmentId,
            reviewerIds,
          })
          .catch((error) => failWithFormId(assessmentId, title, 'setting its reviewers', error));
      }

      const fullForm = await graphql
        .getAssessment(assessmentId)
        .catch((error) => failWithFormId(assessmentId, title, 'reading its questions', error));
      if (!fullForm.sections || fullForm.sections.length === 0) {
        return createToolResult(true, {
          assessment: fullForm,
          message: 'Assessment created but has no sections/questions to prefill.',
          answersApplied: 0,
        });
      }

      const results: { question: string; status: string; answer?: string }[] = [];
      let answersApplied = 0;
      let answersSkipped = 0;

      for (const section of fullForm.sections as AssessmentSection[]) {
        if (!section.questions) continue;

        for (const question of section.questions) {
          const answerKey = Object.keys(answers).find(
            (key) =>
              key === question.referenceId ||
              key.toLowerCase() === (question.title || '').toLowerCase() ||
              key === question.id,
          );

          if (!answerKey) {
            results.push({
              question: question.title || question.id,
              status: 'skipped',
            });
            answersSkipped++;
            continue;
          }

          const answerValue = answers[answerKey];
          if (answerValue === undefined) {
            results.push({
              question: question.title || question.id,
              status: 'skipped',
            });
            answersSkipped++;
            continue;
          }

          try {
            const qType = (question.type || '').toUpperCase();

            if (qType === 'SINGLE_SELECT' || qType === 'MULTI_SELECT') {
              const answerValues = Array.isArray(answerValue) ? answerValue : [answerValue];
              const matchedIds: string[] = [];

              for (const val of answerValues) {
                const matchedOption = (question.answerOptions || []).find(
                  (opt) => opt.value.toLowerCase() === val.toLowerCase(),
                );
                if (matchedOption) {
                  matchedIds.push(matchedOption.id);
                }
              }

              if (matchedIds.length > 0) {
                await graphql.selectAssessmentQuestionAnswers({
                  assessmentQuestionId: question.id,
                  assessmentAnswerIds: matchedIds,
                });
                answersApplied++;
                results.push({
                  question: question.title || question.id,
                  status: 'answered',
                  answer: answerValues.join(', '),
                });
              } else {
                await graphql.selectAssessmentQuestionAnswers({
                  assessmentQuestionId: question.id,
                  assessmentAnswerValues: answerValues.map((v) => ({
                    value: v,
                    isUserCreated: true,
                  })),
                });
                answersApplied++;
                results.push({
                  question: question.title || question.id,
                  status: 'answered (custom value)',
                  answer: answerValues.join(', '),
                });
              }
            } else {
              const textValue = Array.isArray(answerValue) ? answerValue.join('\n') : answerValue;
              await graphql.selectAssessmentQuestionAnswers({
                assessmentQuestionId: question.id,
                assessmentAnswerValues: [{ value: textValue, isUserCreated: true }],
              });
              answersApplied++;
              results.push({
                question: question.title || question.id,
                status: 'answered',
                answer: textValue.length > 100 ? textValue.substring(0, 100) + '...' : textValue,
              });
            }
          } catch (err) {
            results.push({
              question: question.title || question.id,
              status: `error: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      }

      const verifiedForm = await graphql
        .getAssessment(assessmentId)
        .catch((error) =>
          failWithFormId(assessmentId, title, 'checking the answers landed', error),
        );
      const unansweredQuestions = (verifiedForm.sections as AssessmentSection[] | undefined)
        ?.flatMap((section) => section.questions ?? [])
        .filter((question) => !question.selectedAnswers?.length)
        .map((question) => question.title || question.id);
      const failedResults = results.filter((result) => result.status.startsWith('error:'));

      if (failedResults.length > 0 || unansweredQuestions?.length) {
        return createToolResult(
          false,
          undefined,
          `Assessment "${title}" was created and assigned, but only ${answersApplied}/${results.length} questions were answered. Retry the unanswered questions before submitting.`,
          {
            code: 'ASSESSMENT_PREFILL_INCOMPLETE',
            retryable: true,
            details: {
              assessmentId,
              answersApplied,
              totalQuestions: results.length,
              unansweredQuestions: unansweredQuestions ?? [],
              errors: failedResults.map(({ question, status }) => ({ question, status })),
            },
          },
        );
      }

      let submitResult: Assessment | null = null;
      if (submitForReview) {
        const sectionIds = (fullForm.sections as AssessmentSection[]).map((s) => s.id);
        if (sectionIds.length > 0) {
          submitResult = await graphql
            .submitAssessmentForReview({
              id: assessmentId,
              assessmentSectionIds: sectionIds,
            })
            .catch((error) =>
              failWithFormId(assessmentId, title, 'submitting it for review', error),
            );
        }
      }

      return createToolResult(true, {
        assessmentId,
        title,
        answersApplied,
        answersSkipped,
        totalQuestions: results.length,
        ...(includeDetails && { results }),
        assignment: {
          status: assignmentResult.status,
          message: 'Assignees updated before prefilling',
        },
        submittedForReview: !!submitResult,
        message:
          `Assessment "${title}" created and prefilled with ${answersApplied}/${results.length} answers. ` +
          'Assigned before prefilling. ' +
          (submitResult ? 'Submitted for review.' : 'Ready for manual submission.'),
      });
    },
  });
}

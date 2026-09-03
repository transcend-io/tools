import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type Assessment,
  type AssessmentSection,
} from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';
import { resolveTemplateToGroupId } from './_helpers.js';

export const PrefillSchema = z.object({
  title: z.string().describe('Title for the new assessment form'),
  templateId: z
    .string()
    .optional()
    .describe(
      'Template ID to create the form from. Will auto-resolve to the first matching assessment group.',
    ),
  assessmentGroupId: z
    .string()
    .optional()
    .describe('Assessment group ID (alternative to templateId)'),
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
    .describe('Internal user IDs to assign the form to (optional)'),
  assigneeEmails: z
    .array(z.string())
    .optional()
    .describe('External email addresses to assign the form to (optional)'),
  reviewerIds: z.array(z.string()).optional().describe('User IDs to set as reviewers (optional)'),
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
      'one call. Combines: create form → read its questions → answer each → assign reviewers → ' +
      'optionally submit. The answers are yours to provide; nothing is generated for you.',
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

      const assessment = await graphql.createAssessment({
        title,
        assessmentGroupId: resolvedAssessmentGroupId,
      });
      const assessmentId = assessment.id;

      const fullForm = await graphql.getAssessment(assessmentId);
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

      let assignmentResult: Record<string, unknown> | null = null;
      if (assigneeIds || assigneeEmails) {
        assignmentResult = await graphql.updateAssessmentFormAssignees({
          id: assessmentId,
          assigneeIds,
          externalAssigneeEmails: assigneeEmails,
        });
      }

      if (reviewerIds) {
        await graphql.updateAssessment({
          id: assessmentId,
          reviewerIds,
        });
      }

      let submitResult: Assessment | null = null;
      if (submitForReview) {
        const sectionIds = (fullForm.sections as AssessmentSection[]).map((s) => s.id);
        if (sectionIds.length > 0) {
          submitResult = await graphql.submitAssessmentForReview({
            id: assessmentId,
            assessmentSectionIds: sectionIds,
          });
        }
      }

      return createToolResult(true, {
        assessmentId,
        title,
        answersApplied,
        answersSkipped,
        totalQuestions: results.length,
        results,
        assignment: assignmentResult
          ? {
              status: assignmentResult.status,
              message: 'Assignees updated',
            }
          : null,
        submittedForReview: !!submitResult,
        message:
          `Assessment "${title}" created and prefilled with ${answersApplied}/${results.length} answers. ` +
          (assignmentResult ? `Assigned to reviewers. ` : '') +
          (submitResult ? 'Submitted for review.' : 'Ready for manual submission.'),
      });
    },
  });
}

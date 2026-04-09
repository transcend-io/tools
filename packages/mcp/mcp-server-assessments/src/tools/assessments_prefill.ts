import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type Assessment,
  type AssessmentSection,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { resolveTemplateToGroupId } from './_helpers.js';

const PrefillSchema = z.object({
  title: z.string(),
  template_id: z.string().optional(),
  assessment_group_id: z.string().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  assignee_ids: z.array(z.string()).optional(),
  assignee_emails: z.array(z.string()).optional(),
  reviewer_ids: z.array(z.string()).optional(),
  submit_for_review: z.boolean().optional(),
});

export function createAssessmentsPrefillTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_prefill',
    description:
      'Convenience tool: Create a new assessment form, AI-prefill all the answers, and assign it to a reviewer. ' +
      'Combines: create form → get questions → answer each question → assign reviewers → optionally submit for review. ' +
      'Provide answers as a map of {questionTitle: answer} or {referenceId: answer}. ' +
      'For SINGLE_SELECT/MULTI_SELECT, the answer should match the exact text of the answer option(s). ' +
      'For text questions, provide the free-text answer string. ' +
      'For multi-select, provide an array of answer option values.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates assessment, prefills answers, assigns reviewers',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: PrefillSchema,
    handler: async (args) => {
      try {
        const { answers, title } = args;

        let assessmentGroupId = args.assessment_group_id;
        if (!assessmentGroupId && args.template_id) {
          const resolved = await resolveTemplateToGroupId(graphql, args.template_id);
          if ('error' in resolved) return resolved.error;
          assessmentGroupId = resolved.groupId;
        }
        if (!assessmentGroupId) {
          return createToolResult(
            false,
            undefined,
            'Either template_id or assessment_group_id is required.',
          );
        }

        const assessment = await graphql.createAssessment({
          title,
          assessmentGroupId,
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
        if (args.assignee_ids || args.assignee_emails) {
          assignmentResult = await graphql.updateAssessmentFormAssignees({
            id: assessmentId,
            assigneeIds: args.assignee_ids,
            externalAssigneeEmails: args.assignee_emails,
          });
        }

        if (args.reviewer_ids) {
          await graphql.updateAssessment({
            id: assessmentId,
            reviewerIds: args.reviewer_ids,
          });
        }

        let submitResult: Assessment | null = null;
        if (args.submit_for_review) {
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

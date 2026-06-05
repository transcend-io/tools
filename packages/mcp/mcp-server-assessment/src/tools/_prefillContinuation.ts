import type { Assessment, AssessmentSection } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export interface PrefillContinuationArgs {
  answers: Record<string, string | string[]>;
  assignee_ids?: string[];
  assignee_emails?: string[];
  reviewer_ids?: string[];
  submit_for_review?: boolean;
}

export interface PrefillContinuationResult {
  results: { question: string; status: string; answer?: string }[];
  answersApplied: number;
  answersSkipped: number;
  assignmentResult: Record<string, unknown> | null;
  submitResult: Assessment | null;
}

export async function runPrefillContinuation(
  graphql: AssessmentsMixin,
  assessmentId: string,
  fullForm: Assessment,
  {
    answers,
    assignee_ids,
    assignee_emails,
    reviewer_ids,
    submit_for_review,
  }: PrefillContinuationArgs,
): Promise<PrefillContinuationResult> {
  const results: { question: string; status: string; answer?: string }[] = [];
  let answersApplied = 0;
  let answersSkipped = 0;

  for (const section of (fullForm.sections ?? []) as AssessmentSection[]) {
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
  if (assignee_ids?.length || assignee_emails?.length) {
    assignmentResult = await graphql.updateAssessmentFormAssignees({
      id: assessmentId,
      assigneeIds: assignee_ids,
      externalAssigneeEmails: assignee_emails,
    });
  }

  if (reviewer_ids?.length) {
    await graphql.updateAssessment({
      id: assessmentId,
      reviewerIds: reviewer_ids,
    });
  }

  let submitResult: Assessment | null = null;
  if (submit_for_review) {
    const sectionIds = ((fullForm.sections ?? []) as AssessmentSection[]).map((s) => s.id);
    if (sectionIds.length > 0) {
      submitResult = await graphql.submitAssessmentForReview({
        id: assessmentId,
        assessmentSectionIds: sectionIds,
      });
    }
  }

  return {
    results,
    answersApplied,
    answersSkipped,
    assignmentResult,
    submitResult,
  };
}

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

import {
  PREFILL_ASSIGNEE_REQUIRED,
  PREFILL_INCOMPLETE,
  PREFILL_INTERNAL_ASSIGNEE_REQUIRED,
} from '../errors.js';
import type { AssessmentsMixin } from '../graphql.js';
import { buildAssessmentLinks } from '../helpers/buildAssessmentLinks.js';

/**
 * Re-raise a failure from after the form was created, naming the form.
 *
 * This tool creates before it does anything else, so every later step fails
 * with a form already on the dashboard. A bare error names none of it, leaving
 * the caller no handle on what it made and no recovery but to create a second
 * one, which is how half-built duplicates end up in a group.
 *
 * The message also reports how many answers had landed by then. "Created but
 * submitting failed" alone does not say whether the form holds every answer or
 * none, and that is the difference between finishing it and starting over.
 *
 * @param assessmentId - The form that already exists
 * @param title - Its title, so the message reads without a second lookup
 * @param step - What was being attempted, phrased to follow "but "
 * @param error - The underlying failure
 * @param progress - Answers written before the failure, out of the form's total
 * @param hint - What to do differently, when the step has a known cause
 * @throws ToolError naming the form, its progress and the step that failed
 */
/** Progress for a failure that landed before any answer was attempted. */
const NOT_STARTED = { answersApplied: 0, totalQuestions: 0 };

function failWithFormId(
  assessmentId: string,
  title: string,
  step: string,
  error: unknown,
  progress: { answersApplied: number; totalQuestions: number },
  hint?: string,
): never {
  const { answersApplied, totalQuestions } = progress;
  // Failing before the questions were read means nothing was written yet, and
  // "0/0 answers" would read as a form that came back empty.
  const held = totalQuestions
    ? `holds ${answersApplied}/${totalQuestions} answers`
    : 'holds no answers yet';
  throw new ToolError(
    ErrorCode.API_ERROR,
    `Assessment "${title}" was created but ${step} failed: ${
      error instanceof Error ? error.message : String(error)
    }. The form exists and ${held}. Read it with ` +
      `assessments_get and finish it there rather than creating another.${hint ? ` ${hint}` : ''}`,
    false,
    { assessmentId, step, answersApplied, totalQuestions },
  );
}

export const PrefillSchema = z.object({
  title: z.string().describe('Title for the new assessment form'),
  assessmentGroupId: z
    .string()
    .describe(
      'Group to create the form in. Find it by name with assessments_list_groups. If no group ' +
        'is built from the template you want, create one with assessments_create_group rather ' +
        'than guessing at an existing group.',
    ),
  answers: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .describe(
      'Map of answers keyed by question title or referenceId, both of which come from ' +
        'assessments_export_template on the template you are creating from. Prefer referenceId; ' +
        'it survives rewording. A string for text and single-select, an array for multi-select. ' +
        'A select value matching an option text selects it, and anything else is kept as a ' +
        'custom answer, so do not drop a value the options do not cover.',
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
      'External email addresses to assign before prefilling. Provide this or assigneeIds so the ' +
        'form can leave DRAFT. They can answer but cannot submit, so submitForReview also needs ' +
        'assigneeIds.',
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
  const { dashboardUrl } = clients;
  return defineTool({
    name: 'assessments_prefill',
    description:
      'Create an assessment form, fill in the answers you supply, and assign it for review in ' +
      'one call. Combines: create form → assign it → read its questions → answer each → ' +
      'optionally submit. Requires assigneeIds or assigneeEmails: a form accepts no answers ' +
      'until it is assigned. The answers are yours to provide; nothing is generated for you. ' +
      'Surface the returned `url` verbatim.',
    category: 'Assessments',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: PrefillSchema,
    handler: async ({
      answers,
      title,
      assessmentGroupId,
      assigneeIds,
      assigneeEmails,
      reviewerIds,
      includeDetails,
      submitForReview,
    }) => {
      if (!assigneeIds?.length && !assigneeEmails?.length) {
        return createToolResult(
          false,
          undefined,
          'Provide assigneeIds or assigneeEmails before prefilling. An assessment must be assigned so it can move from DRAFT to SHARED before answers move it to IN_PROGRESS.',
          PREFILL_ASSIGNEE_REQUIRED,
        );
      }
      // External assignees can answer a form but cannot submit it, so this
      // combination can only ever fail — and it would fail at the last step,
      // after a form was created and every answer written.
      if (submitForReview && !assigneeIds?.length) {
        return createToolResult(
          false,
          undefined,
          'submitForReview needs assigneeIds. Submitting acts as the calling user, so that user must be among the internal assignees. External assignees can answer a form but cannot submit it, so assigneeEmails alone would create the form, fill it in, and then fail to submit.',
          PREFILL_INTERNAL_ASSIGNEE_REQUIRED,
        );
      }

      const assessment = await graphql.createAssessment({
        title,
        assessmentGroupId,
        assigneeIds,
      });
      const assessmentId = assessment.id;

      const assignmentResult = await graphql
        .updateAssessmentFormAssignees({
          id: assessmentId,
          assigneeIds,
          externalAssigneeEmails: assigneeEmails,
        })
        .catch((error) => failWithFormId(assessmentId, title, 'assigning it', error, NOT_STARTED));

      if (reviewerIds) {
        await graphql
          .updateAssessment({
            id: assessmentId,
            reviewerIds,
          })
          .catch((error) =>
            failWithFormId(assessmentId, title, 'setting its reviewers', error, NOT_STARTED),
          );
      }

      const fullForm = await graphql
        .getAssessment(assessmentId)
        .catch((error) =>
          failWithFormId(assessmentId, title, 'reading its questions', error, NOT_STARTED),
        );
      if (!fullForm.sections || fullForm.sections.length === 0) {
        return createToolResult(true, {
          assessment: fullForm,
          ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: assessmentId }),
          message: 'Assessment created but has no sections/questions to prefill.',
          answersApplied: 0,
        });
      }

      const results: { question: string; status: string; answer?: string }[] = [];
      let answersApplied = 0;
      let answersSkipped = 0;
      // Keys are matched against the form, not the other way round, so a key
      // that matches nothing is never visited. Recording the ones that hit
      // leaves the misses to be reported instead of dropped in silence.
      const matchedAnswerKeys = new Set<string>();

      for (const section of fullForm.sections as AssessmentSection[]) {
        if (!section.questions) continue;

        for (const question of section.questions) {
          const answerKey = Object.keys(answers).find(
            (key) =>
              key === question.referenceId ||
              key.toLowerCase() === (question.title || '').toLowerCase() ||
              key === question.id,
          );
          if (answerKey) matchedAnswerKeys.add(answerKey);

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
              const customValues: string[] = [];

              for (const val of answerValues) {
                const matchedOption = (question.answerOptions || []).find(
                  (opt) => opt.value.toLowerCase() === val.toLowerCase(),
                );
                if (matchedOption) {
                  matchedIds.push(matchedOption.id);
                } else {
                  customValues.push(val);
                }
              }

              // Sent together so a multi-select that half matches keeps both
              // halves. Writing only the matches dropped the rest while still
              // reporting the question answered.
              await graphql.selectAssessmentQuestionAnswers({
                assessmentQuestionId: question.id,
                ...(matchedIds.length > 0 && { assessmentAnswerIds: matchedIds }),
                ...(customValues.length > 0 && {
                  assessmentAnswerValues: customValues.map((v) => ({
                    value: v,
                    isUserCreated: true,
                  })),
                }),
              });
              answersApplied++;
              results.push({
                question: question.title || question.id,
                status: customValues.length > 0 ? 'answered (custom value)' : 'answered',
                answer: answerValues.join(', '),
              });
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

      const verifiedForm = await graphql.getAssessment(assessmentId).catch((error) =>
        failWithFormId(assessmentId, title, 'checking the answers landed', error, {
          answersApplied,
          totalQuestions: results.length,
        }),
      );
      const unansweredQuestions = (verifiedForm.sections as AssessmentSection[] | undefined)
        ?.flatMap((section) => section.questions ?? [])
        .filter((question) => !question.selectedAnswers?.length)
        .map((question) => question.title || question.id);
      const failedResults = results.filter((result) => result.status.startsWith('error:'));
      const unmatchedAnswerKeys = Object.keys(answers).filter((key) => !matchedAnswerKeys.has(key));

      // A question nobody supplied an answer for is a caller leaving it blank,
      // which on a compliance record is often the correct thing to do. Only an
      // answer that was given and did not land is a failure: either the write
      // was rejected, or the key named a question the form does not have.
      if (failedResults.length > 0 || unmatchedAnswerKeys.length > 0) {
        const causes = [
          failedResults.length > 0
            ? `${failedResults.length} answer${failedResults.length === 1 ? ' was' : 's were'} rejected`
            : '',
          unmatchedAnswerKeys.length > 0
            ? `${unmatchedAnswerKeys.length} answer key${
                unmatchedAnswerKeys.length === 1 ? '' : 's'
              } matched no question on the form`
            : '',
        ].filter(Boolean);
        return createToolResult(
          false,
          undefined,
          `Assessment "${title}" was created and assigned, but ${causes.join(' and ')}. ` +
            'Keys must match a question title or referenceId from assessments_export_template. ' +
            'The form exists, so finish it with assessments_answer_question and then ' +
            'assessments_submit_response; calling assessments_prefill again would create a second form.',
          {
            ...PREFILL_INCOMPLETE,
            details: {
              assessmentId,
              ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: assessmentId }),
              answersApplied,
              totalQuestions: results.length,
              unmatchedAnswerKeys,
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
              failWithFormId(
                assessmentId,
                title,
                'submitting it for review',
                error,
                { answersApplied, totalQuestions: results.length },
                // The caller may be assigned to some other user, which reads as
                // the same "not assigned to this user" error as having only
                // external assignees.
                'Submitting acts as the calling user, so that user must be among assigneeIds.',
              ),
            );
        }
      }

      return createToolResult(true, {
        assessmentId,
        ...buildAssessmentLinks({ dashboardUrl, assessmentFormId: assessmentId }),
        title,
        answersApplied,
        answersSkipped,
        totalQuestions: results.length,
        // Named so a caller can tell a form it deliberately left partly blank
        // from one it believes it filled, which the counts alone do not say.
        ...(unansweredQuestions?.length && { unansweredQuestions }),
        ...(includeDetails && { results }),
        assignment: {
          status: assignmentResult.status,
          message: 'Assignees updated before prefilling',
        },
        submittedForReview: !!submitResult,
        message:
          `Assessment "${title}" created and prefilled with ${answersApplied}/${results.length} answers. ` +
          'Assigned before prefilling. ' +
          (unansweredQuestions?.length
            ? `${unansweredQuestions.length} questions were left unanswered because no answer was supplied for them. `
            : '') +
          (submitResult ? 'Submitted for review.' : 'Ready for manual submission.'),
      });
    },
  });
}

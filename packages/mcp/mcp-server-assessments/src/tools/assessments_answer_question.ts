import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const AnswerQuestionSchema = z.object({
  assessment_question_id: z.string().describe('ID of the assessment question to answer'),
  assessment_answer_ids: z
    .array(z.string())
    .optional()
    .describe(
      'IDs of existing answer options to select (for SINGLE_SELECT/MULTI_SELECT questions)',
    ),
  assessment_answer_values: z
    .array(z.object({ value: z.string(), isUserCreated: z.boolean() }))
    .optional()
    .describe(
      'Free-text answer values to create and select (for text questions). Each item: {value: string, isUserCreated: boolean}',
    ),
});

export function createAssessmentsAnswerQuestionTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_answer_question',
    description:
      'Answer an assessment question by selecting existing answer options or providing free-text values. For SINGLE_SELECT/MULTI_SELECT questions, provide assessmentAnswerIds from the answerOptions. For SHORT_ANSWER_TEXT/LONG_ANSWER_TEXT, provide assessmentAnswerValues with {value, isUserCreated: true}.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Records answer to the assessment question',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: AnswerQuestionSchema,
    handler: async ({
      assessment_question_id,
      assessment_answer_ids,
      assessment_answer_values,
    }) => {
      const input: {
        assessmentQuestionId: string;
        assessmentAnswerIds?: string[];
        assessmentAnswerValues?: { value: string; isUserCreated: boolean }[];
      } = {
        assessmentQuestionId: assessment_question_id,
      };

      if (assessment_answer_ids) {
        input.assessmentAnswerIds = assessment_answer_ids;
      }
      if (assessment_answer_values) {
        input.assessmentAnswerValues = assessment_answer_values;
      }

      const result = await graphql.selectAssessmentQuestionAnswers(input);

      return createToolResult(true, {
        selectedAnswers: result,
        message: 'Assessment question answered successfully',
      });
    },
  });
}

import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import type { AssessmentsMixin } from '../graphql.js';

export const AnswerQuestionValueSchema = z.object({
  value: z.string(),
  isUserCreated: z.boolean(),
});
export type AnswerQuestionValueInput = z.infer<typeof AnswerQuestionValueSchema>;

export const AnswerQuestionSchema = z.object({
  assessmentQuestionId: z.string().describe('ID of the assessment question to answer'),
  assessmentAnswerIds: z
    .array(z.string())
    .optional()
    .describe(
      'IDs of existing answer options to select (for SINGLE_SELECT/MULTI_SELECT questions)',
    ),
  assessmentAnswerValues: z
    .array(AnswerQuestionValueSchema)
    .optional()
    .describe(
      'Free-text answer values to create and select (for text questions). Each item: {value: string, isUserCreated: boolean}',
    ),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionSchema>;

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
    handler: async ({ assessmentQuestionId, assessmentAnswerIds, assessmentAnswerValues }) => {
      const input: {
        assessmentQuestionId: string;
        assessmentAnswerIds?: string[];
        assessmentAnswerValues?: { value: string; isUserCreated: boolean }[];
      } = {
        assessmentQuestionId,
      };

      if (assessmentAnswerIds) {
        input.assessmentAnswerIds = assessmentAnswerIds;
      }
      if (assessmentAnswerValues) {
        input.assessmentAnswerValues = assessmentAnswerValues;
      }

      const result = await graphql.selectAssessmentQuestionAnswers(input);

      return createToolResult(true, {
        selectedAnswers: result,
        message: 'Assessment question answered successfully',
      });
    },
  });
}

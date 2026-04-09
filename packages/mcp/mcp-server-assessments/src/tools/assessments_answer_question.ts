import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const AnswerQuestionSchema = z.object({
  assessment_question_id: z.string(),
  assessment_answer_ids: z.array(z.string()).optional(),
  assessment_answer_values: z
    .array(z.object({ value: z.string(), isUserCreated: z.boolean() }))
    .optional(),
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
    handler: async (args) => {
      try {
        const input: {
          assessmentQuestionId: string;
          assessmentAnswerIds?: string[];
          assessmentAnswerValues?: { value: string; isUserCreated: boolean }[];
        } = {
          assessmentQuestionId: args.assessment_question_id,
        };

        if (args.assessment_answer_ids) {
          input.assessmentAnswerIds = args.assessment_answer_ids;
        }
        if (args.assessment_answer_values) {
          input.assessmentAnswerValues = args.assessment_answer_values;
        }

        const result = await graphql.selectAssessmentQuestionAnswers(input);

        return createToolResult(true, {
          selectedAnswers: result,
          message: 'Assessment question answered successfully',
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

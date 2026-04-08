import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { AnswerQuestionSchema } from '../schemas.js';

export function createAssessmentsAnswerQuestionTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_answer_question',
    description:
      'Answer an assessment question by selecting existing answer options or providing free-text values. For SINGLE_SELECT/MULTI_SELECT questions, provide assessmentAnswerIds from the answerOptions. For SHORT_ANSWER_TEXT/LONG_ANSWER_TEXT, provide assessmentAnswerValues with {value, isUserCreated: true}.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Records answer to the assessment question',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        assessment_question_id: {
          type: 'string',
          description: 'ID of the assessment question to answer',
        },
        assessment_answer_ids: {
          type: 'array',
          description:
            'IDs of existing answer options to select (for SINGLE_SELECT/MULTI_SELECT questions)',
          items: { type: 'string' },
        },
        assessment_answer_values: {
          type: 'array',
          description:
            'Free-text answer values to create and select (for text questions). Each item: {value: string, isUserCreated: boolean}',
          items: { type: 'object' },
        },
      },
      required: ['assessment_question_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(AnswerQuestionSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const input: {
          assessmentQuestionId: string;
          assessmentAnswerIds?: string[];
          assessmentAnswerValues?: { value: string; isUserCreated: boolean }[];
        } = {
          assessmentQuestionId: parsed.data.assessment_question_id,
        };

        if (parsed.data.assessment_answer_ids) {
          input.assessmentAnswerIds = parsed.data.assessment_answer_ids;
        }
        if (parsed.data.assessment_answer_values) {
          input.assessmentAnswerValues = parsed.data.assessment_answer_values;
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
  };
}

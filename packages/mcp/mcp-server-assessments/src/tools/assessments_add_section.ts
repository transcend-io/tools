import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
  type AssessmentSectionInput,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { AddSectionSchema } from '../schemas.js';

export function createAssessmentsAddSectionTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_add_section',
    description:
      'Add a new section (with optional inline questions) to an existing assessment form template. ' +
      'Useful for building templates incrementally or adding sections to imported templates. ' +
      'Same auto-corrections as assessments_create_template apply to questions.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Adds a section to the assessment template',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        template_id: {
          type: 'string',
          description: 'ID of the assessment form template to add the section to',
        },
        title: {
          type: 'string',
          description: 'Title of the new section',
        },
        questions: {
          type: 'array',
          description:
            'Array of question objects: [{title, type, subType?, description?, placeholder?, isRequired?, referenceId?, answerOptions?: [{value}], allowSelectOther?, requireRiskEvaluation?}]. ' +
            'Types: LONG_ANSWER_TEXT, SHORT_ANSWER_TEXT, SINGLE_SELECT, MULTI_SELECT, FILE. ' +
            'SubTypes: NONE, CUSTOM, USER, TEAM, DATA_SUB_CATEGORY, HAS_PERSONAL_DATA, ATTRIBUTE_KEY, SENSITIVE_CATEGORY. ' +
            'referenceId is optional (auto-generated UUID if omitted). allowSelectOther auto-sets subType to CUSTOM.',
          items: { type: 'object' },
        },
      },
      required: ['template_id', 'title'],
    },
    handler: async (args) => {
      const parsed = validateArgs(AddSectionSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const result = await graphql.createAssessmentSection({
          assessmentFormTemplateId: parsed.data.template_id,
          title: parsed.data.title,
          questions: parsed.data.questions as AssessmentSectionInput['questions'],
        });

        return createToolResult(true, {
          section: result,
          message: `Section "${parsed.data.title}" added to template successfully`,
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

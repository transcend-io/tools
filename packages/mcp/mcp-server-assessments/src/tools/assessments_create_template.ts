import {
  createToolResult,
  validateArgs,
  type ToolDefinition,
  type ToolClients,
  type AssessmentTemplateCreateInput,
  type AssessmentSectionInput,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';
import { CreateTemplateSchema } from '../schemas.js';

export function createAssessmentsCreateTemplateTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_create_template',
    description:
      'Create a new assessment form template with sections and questions inline. ' +
      'This is the "import" side of the JSON import/export workflow. ' +
      'You can provide the full template structure (sections with questions and answer options) in a single call. ' +
      'Question types: LONG_ANSWER_TEXT, SHORT_ANSWER_TEXT, SINGLE_SELECT, MULTI_SELECT, FILE. ' +
      'SubTypes: NONE, CUSTOM, USER, TEAM, DATA_SUB_CATEGORY, HAS_PERSONAL_DATA, ATTRIBUTE_KEY, SENSITIVE_CATEGORY. ' +
      'Auto-corrections: referenceId is auto-generated as UUID if missing or not UUID format; ' +
      'subType is auto-set to CUSTOM when allowSelectOther is true; ' +
      'requireRiskEvaluation is ignored when no riskFrameworkId is provided.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Creates a new assessment form template',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the assessment form template',
        },
        description: {
          type: 'string',
          description: 'Description of the template',
        },
        status: {
          type: 'string',
          description: 'Template status: DRAFT or PUBLISHED (default: DRAFT)',
          enum: ['DRAFT', 'PUBLISHED'],
        },
        sections: {
          type: 'array',
          description:
            'Array of section objects. Each section: {title: string, questions?: [{title, type, subType?, description?, placeholder?, isRequired?, referenceId?, answerOptions?: [{value}], allowSelectOther?, requireRiskEvaluation?}]}. ' +
            'Question types: LONG_ANSWER_TEXT, SHORT_ANSWER_TEXT, SINGLE_SELECT, MULTI_SELECT, FILE. ' +
            'SubTypes: NONE, CUSTOM, USER, TEAM, DATA_SUB_CATEGORY, HAS_PERSONAL_DATA, ATTRIBUTE_KEY, SENSITIVE_CATEGORY. ' +
            'referenceId is optional (auto-generated UUID if omitted or not UUID format). ' +
            'allowSelectOther auto-sets subType to CUSTOM. requireRiskEvaluation requires riskFrameworkId.',
          items: { type: 'object' },
        },
      },
      required: ['title'],
    },
    handler: async (args) => {
      const parsed = validateArgs(CreateTemplateSchema, args);
      if (!parsed.success) return parsed.error;

      try {
        const input: AssessmentTemplateCreateInput = {
          title: parsed.data.title,
          description: parsed.data.description,
          status: parsed.data.status ?? 'DRAFT',
          sections: parsed.data.sections as AssessmentSectionInput[] | undefined,
        };

        const result = await graphql.createAssessmentFormTemplate(input);

        return createToolResult(true, {
          template: result,
          message: `Assessment template "${parsed.data.title}" created successfully`,
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

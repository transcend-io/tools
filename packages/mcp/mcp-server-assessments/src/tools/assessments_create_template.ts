import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type AssessmentTemplateCreateInput,
  type AssessmentSectionInput,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const CreateTemplateSchema = z.object({
  title: z.string().describe('Title of the assessment form template'),
  description: z.string().optional().describe('Description of the template'),
  status: z
    .enum(['DRAFT', 'PUBLISHED'])
    .optional()
    .describe('Template status: DRAFT or PUBLISHED (default: DRAFT)'),
  sections: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Array of section objects with title and optional questions array'),
});

export function createAssessmentsCreateTemplateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
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
    zodSchema: CreateTemplateSchema,
    handler: async (args) => {
      try {
        const input: AssessmentTemplateCreateInput = {
          title: args.title,
          description: args.description,
          status: args.status ?? 'DRAFT',
          sections: args.sections as AssessmentSectionInput[] | undefined,
        };

        const result = await graphql.createAssessmentFormTemplate(input);

        return createToolResult(true, {
          template: result,
          message: `Assessment template "${args.title}" created successfully`,
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

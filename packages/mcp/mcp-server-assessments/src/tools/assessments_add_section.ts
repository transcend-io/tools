import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type AssessmentSectionInput,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const AddSectionSchema = z.object({
  template_id: z.string().describe('ID of the assessment form template to add the section to'),
  title: z.string().describe('Title of the new section'),
  questions: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      'Array of question objects: [{title, type, subType?, description?, placeholder?, isRequired?, referenceId?, answerOptions?: [{value}], allowSelectOther?, requireRiskEvaluation?}]',
    ),
});

export function createAssessmentsAddSectionTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_add_section',
    description:
      'Add a new section (with optional inline questions) to an existing assessment form template. ' +
      'Useful for building templates incrementally or adding sections to imported templates. ' +
      'Same auto-corrections as assessments_create_template apply to questions.',
    category: 'Assessments',
    readOnly: false,
    confirmationHint: 'Adds a section to the assessment template',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: AddSectionSchema,
    handler: async ({ template_id, title, questions }) => {
      try {
        const result = await graphql.createAssessmentSection({
          assessmentFormTemplateId: template_id,
          title,
          questions: questions as AssessmentSectionInput['questions'],
        });

        return createToolResult(true, {
          section: result,
          message: `Section "${title}" added to template successfully`,
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

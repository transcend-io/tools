import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type AssessmentTemplateCreateInput,
  type AssessmentSectionInput,
} from '@transcend-io/mcp-server-base';
import { AssessmentFormTemplateStatus } from '@transcend-io/privacy-types';

import type { AssessmentsMixin } from '../graphql.js';

export const CreateTemplateSchema = z.object({
  title: z.string().describe('Title of the assessment form template'),
  description: z.string().optional().describe('Description of the template'),
  status: z
    .nativeEnum(AssessmentFormTemplateStatus)
    .optional()
    .describe('Template status: DRAFT or PUBLISHED (default: DRAFT)'),
  sections: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Array of section objects with title and optional questions array'),
});
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;

export function createAssessmentsCreateTemplateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_create_template',
    description:
      'Create an assessment form template with sections and questions (JSON import). ' +
      'Question types: LONG_ANSWER_TEXT, SHORT_ANSWER_TEXT, SINGLE_SELECT, MULTI_SELECT, FILE. ' +
      'Missing referenceId becomes a UUID; allowSelectOther forces subType CUSTOM.',
    category: 'Assessments',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: CreateTemplateSchema,
    handler: async ({ title, description, status, sections }) => {
      const input: AssessmentTemplateCreateInput = {
        title,
        description,
        status: status ?? 'DRAFT',
        sections: sections as AssessmentSectionInput[] | undefined,
      };

      const result = await graphql.createAssessmentFormTemplate(input);

      return createToolResult(true, {
        template: result,
        message: `Assessment template "${title}" created successfully`,
      });
    },
  });
}

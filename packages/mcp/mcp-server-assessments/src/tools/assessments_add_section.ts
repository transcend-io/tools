import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
  type AssessmentSectionInput,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const AddSectionSchema = z.object({
  template_id: z.string(),
  title: z.string(),
  questions: z.array(z.record(z.string(), z.unknown())).optional(),
});

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
    zodSchema: AddSectionSchema,
    handler: async (args: z.infer<typeof AddSectionSchema>) => {
      try {
        const result = await graphql.createAssessmentSection({
          assessmentFormTemplateId: args.template_id,
          title: args.title,
          questions: args.questions as AssessmentSectionInput['questions'],
        });

        return createToolResult(true, {
          section: result,
          message: `Section "${args.title}" added to template successfully`,
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

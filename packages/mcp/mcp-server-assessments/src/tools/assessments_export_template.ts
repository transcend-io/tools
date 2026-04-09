import {
  createToolResult,
  z,
  type ToolDefinition,
  type ToolClients,
} from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

const ExportTemplateSchema = z.object({
  template_id: z.string(),
});

export function createAssessmentsExportTemplateTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as AssessmentsMixin;
  return {
    name: 'assessments_export_template',
    description:
      'Export a full assessment form template as JSON, including all sections, questions, answer options, ' +
      'and configuration. This is the "export" side of the JSON import/export workflow. ' +
      'The output can be used as input for assessments_create_template to recreate the template elsewhere.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ExportTemplateSchema,
    handler: async (args: z.infer<typeof ExportTemplateSchema>) => {
      try {
        const template = await graphql.getAssessmentFormTemplate(args.template_id);

        const exportData = {
          _exportedAt: new Date().toISOString(),
          _format: 'transcend-assessment-template-v1',
          template: {
            title: template.title,
            description: template.description,
            status: template.status,
            sections: template.sections.map((section) => ({
              title: section.title,
              questions: section.questions.map((q) => ({
                title: q.title,
                type: q.type,
                subType: q.subType,
                description: q.description,
                placeholder: q.placeholder,
                isRequired: q.isRequired,
                referenceId: q.referenceId,
                allowSelectOther: q.allowSelectOther,
                requireRiskEvaluation: q.requireRiskEvaluation,
                answerOptions: q.answerOptions.map((opt) => ({
                  value: opt.value,
                })),
              })),
            })),
          },
          _raw: template,
        };

        return createToolResult(true, exportData);
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

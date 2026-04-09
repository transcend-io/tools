import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-core';

import type { AssessmentsMixin } from '../graphql.js';

export const ExportTemplateSchema = z.object({
  template_id: z.string().describe('ID of the assessment form template to export'),
});
export type ExportTemplateInput = z.infer<typeof ExportTemplateSchema>;

export function createAssessmentsExportTemplateTool(clients: ToolClients) {
  const graphql = clients.graphql as AssessmentsMixin;
  return defineTool({
    name: 'assessments_export_template',
    description:
      'Export a full assessment form template as JSON, including all sections, questions, answer options, ' +
      'and configuration. This is the "export" side of the JSON import/export workflow. ' +
      'The output can be used as input for assessments_create_template to recreate the template elsewhere.',
    category: 'Assessments',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ExportTemplateSchema,
    handler: async ({ template_id }) => {
      const template = await graphql.getAssessmentFormTemplate(template_id);

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
    },
  });
}

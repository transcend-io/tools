import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { TemplateInput } from '@transcend-io/sdk';

export const WriteEmailTemplatesSchema = z.object({
  templates: ymlItemsSchema(
    'Email templates in the transcend.yml `templates` format, e.g. [{ "title": "Request received" }]. ' +
      'Use config_get_schema for the full format.',
  ),
});
export type WriteEmailTemplatesInput = z.infer<typeof WriteEmailTemplatesSchema>;

export function createWorkflowsWriteEmailTemplatesTool(clients: ToolClients) {
  return defineTool({
    name: 'workflows_write_email_templates',
    description:
      'Create email templates from a list, same as the `templates` section of `transcend inventory push`. ' +
      'Templates are matched by title. A title that already exists is left unchanged. ' +
      'Returns success and per-template errors.',
    category: 'Workflows',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteEmailTemplatesSchema,
    handler: async ({ templates }) => {
      const items = decodeYmlItems<TemplateInput>(TemplateInput, templates, 'templates', {
        uniqueBy: (item) => item.title,
      });
      return pushYmlSection(clients, { templates: items }, items.length);
    },
  });
}

import {
  createGraphqlRequestClient,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { syncTemplate } from '@transcend-io/sdk';
import { TemplateInput } from '@transcend-io/sdk/transcend-yml';
import { decodeCodec } from '@transcend-io/type-utils';

import { createCollectedLogger } from '../helpers/collectingLogger.js';

export const WriteEmailTemplatesSchema = z.object({
  templates: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(100)
    .describe(
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
      let items: TemplateInput[];
      try {
        items = templates.map((template) => decodeCodec(TemplateInput, template));
      } catch (error) {
        throw new ToolError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid email template: ${error instanceof Error ? error.message : String(error)}`,
          false,
        );
      }

      const client = createGraphqlRequestClient(clients.graphql);
      const { logger, logs } = createCollectedLogger();
      const errors: string[] = [];
      for (const template of items) {
        try {
          await syncTemplate(client, template, { logger });
        } catch (error) {
          errors.push(
            `Failed to sync template "${template.title}": ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      return {
        success: errors.length === 0,
        synced: items.length - errors.length,
        errors,
        ...(errors.length > 0 && { logs }),
      };
    },
  });
}

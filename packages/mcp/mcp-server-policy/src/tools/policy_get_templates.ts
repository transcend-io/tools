import { createToolResult, defineTool, z } from '@transcend-io/mcp-server-base';

import type { PolicyToolClients } from '../helpers/policyContext.js';
import { resolvePolicyGetTemplatesContent } from '../templates/index.js';

export const PolicyGetTemplatesSchema = z.object({
  templateId: z
    .string()
    .optional()
    .describe('Return scaffold files only for this template. Omit for the template list.'),
});
export type PolicyGetTemplatesInput = z.infer<typeof PolicyGetTemplatesSchema>;

export function createPolicyGetTemplatesTool(_clients: PolicyToolClients) {
  return defineTool({
    name: 'policy_get_templates',
    description:
      'List Policy Engine starter templates (no args) or return scaffold files (templateId). ' +
      'ActivatePolicyEngineBundles covers all policy tools — do not create separate API keys per operation.',
    category: 'Policy Engine',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: PolicyGetTemplatesSchema,
    handler: async ({ templateId }) => {
      const content = resolvePolicyGetTemplatesContent(templateId);
      return createToolResult(true, content);
    },
  });
}

import { createToolResult, defineTool, z } from '@transcend-io/mcp-server-base';

import type { PolicyToolClients } from '../helpers/policyContext.js';
import { resolvePolicyHelpContent } from '../templates/index.js';

export const PolicyHelpSchema = z.object({
  templateId: z
    .string()
    .optional()
    .describe('Return scaffold files only for this template. Omit for the template list.'),
});
export type PolicyHelpInput = z.infer<typeof PolicyHelpSchema>;

export function createPolicyHelpTool(_clients: PolicyToolClients) {
  return defineTool({
    name: 'policy_help',
    description:
      'List Policy Engine starter templates (no args) or return scaffold files (templateId). ' +
      'ActivatePolicyEngineBundles covers all policy tools — do not create separate API keys per operation.',
    category: 'Policy Engine',
    readOnly: true,
    requireAuth: false,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: PolicyHelpSchema,
    handler: async ({ templateId }) => {
      const content = resolvePolicyHelpContent(templateId);
      return createToolResult(true, content);
    },
  });
}

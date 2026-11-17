import {
  createGraphqlRequestClient,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { syncPolicies } from '@transcend-io/sdk';
import { PolicyInput } from '@transcend-io/sdk/transcend-yml';

import { createCollectedLogger } from '../helpers/collectingLogger.js';
import { decodeItems, runSync } from '../helpers/syncWrite.js';

export const WritePrivacyPoliciesSchema = z.object({
  policies: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(50)
    .describe(
      'Policies to create or update, matched by title. Each needs title. Optional: type, content, ' +
        'effectiveOn, disableEffectiveOn, disabledLocales. Same shape as the policies section ' +
        'of transcend.yml; see config_get_schema.',
    ),
});
export type WritePrivacyPoliciesInput = z.infer<typeof WritePrivacyPoliciesSchema>;

export function createAdminWritePrivacyPoliciesTool(clients: ToolClients) {
  return defineTool({
    name: 'admin_write_privacy_policies',
    description:
      'Create or update privacy center policies by title: text, type, effective date and ' +
      'disabled locales. Same as the policies section of `transcend inventory push`. Not the ' +
      'policy engine: use policy_publish for that. Titles must be unique in the call.',
    category: 'Admin',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WritePrivacyPoliciesSchema,
    handler: async ({ policies }) => {
      const inputs = decodeItems<PolicyInput>(PolicyInput, policies, 'policies');
      const { logger, logs } = createCollectedLogger();
      return runSync(
        () => syncPolicies(createGraphqlRequestClient(clients.graphql), inputs, { logger }),
        logs,
        inputs.length,
      );
    },
  });
}

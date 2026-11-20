import {
  createCollectedLogger,
  createGraphqlRequestClient,
  decodeItems,
  defineTool,
  runSync,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { PolicyInput, syncPolicies } from '@transcend-io/sdk';

export const WritePoliciesSchema = z.object({
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
export type WritePoliciesInput = z.infer<typeof WritePoliciesSchema>;

export function createPrivacyCenterWritePoliciesTool(clients: ToolClients) {
  return defineTool({
    name: 'privacy_center_write_policies',
    description:
      'Create or update privacy center policies by title: text, type, effective date and ' +
      'disabled locales. Same as the policies section of `transcend inventory push`. Not the ' +
      'policy engine: use policy_publish for that. Titles must be unique in the call.',
    category: 'Privacy Center',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WritePoliciesSchema,
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

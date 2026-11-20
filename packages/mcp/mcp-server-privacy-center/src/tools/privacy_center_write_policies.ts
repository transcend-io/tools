import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlItems,
  pushYmlSection,
  ymlItemsSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import { PolicyInput } from '@transcend-io/sdk';

export const WritePoliciesSchema = z.object({
  policies: ymlItemsSchema(
    'Policies to create or update, matched by title. Each needs title. Optional: type, content, ' +
      'effectiveOn, disableEffectiveOn, disabledLocales. Same shape as the policies section ' +
      'of transcend.yml; see config_get_schema.',
    50,
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
      const inputs = decodeYmlItems<PolicyInput>(PolicyInput, policies, 'policies', {
        uniqueBy: (item) => item.title,
      });
      return pushYmlSection(clients, { policies: inputs }, inputs.length);
    },
  });
}

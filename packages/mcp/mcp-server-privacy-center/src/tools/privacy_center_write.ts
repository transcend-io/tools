import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { decodeYmlRecord, pushYmlSection } from '@transcend-io/mcp-server-base/transcend-yml';
import {
  PrivacyCenterInput,
  type PrivacyCenterInput as PrivacyCenterSettings,
} from '@transcend-io/sdk';

export const WritePrivacyCenterSchema = z.object({
  privacyCenter: z
    .record(z.string(), z.unknown())
    .describe(
      'Privacy center settings to change. Only the fields given are updated. Examples: ' +
        'isDisabled, showPolicies, locales, defaultLocale, supportEmail, theme, footerLinks. ' +
        'Same shape as the privacy-center section of transcend.yml; see config_get_schema.',
    ),
  publishToPrivacyCenter: z
    .boolean()
    .optional()
    .describe('Publish the privacy center after the update. Defaults to false.'),
});
export type WritePrivacyCenterInput = z.infer<typeof WritePrivacyCenterSchema>;

export function createPrivacyCenterWriteTool(clients: ToolClients) {
  return defineTool({
    name: 'privacy_center_write',
    description:
      'Update privacy center settings: visible pages, locales, emails, theme and footer links. ' +
      'Same as the privacy-center section of `transcend inventory push`. Only the fields given ' +
      'change. When footerLinks is given, links missing from it are deleted. Publishes only ' +
      'when publishToPrivacyCenter is true. Returns success and errors.',
    category: 'Privacy Center',
    readOnly: false,
    confirmation: {
      hint:
        'Updates the live privacy center settings. When footerLinks is included, any link not ' +
        'listed is deleted from the privacy center. Review the fields before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: WritePrivacyCenterSchema,
    handler: async ({ privacyCenter, publishToPrivacyCenter = false }) => {
      const input = decodeYmlRecord<PrivacyCenterSettings>(
        PrivacyCenterInput,
        privacyCenter,
        'privacy-center',
      );
      return pushYmlSection(clients, { 'privacy-center': input }, 1, { publishToPrivacyCenter });
    },
  });
}

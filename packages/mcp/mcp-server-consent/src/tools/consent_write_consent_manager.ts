import { defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import {
  decodeYmlRecord,
  pushYmlSection,
  ymlRecordSchema,
} from '@transcend-io/mcp-server-base/transcend-yml';
import {
  ConsentManagerInput,
  type ConsentManagerInput as ConsentManagerSettings,
} from '@transcend-io/privacy-types';

export const WriteConsentManagerSchema = z.object({
  consentManager: ymlRecordSchema(
    ConsentManagerInput,
    'Consent manager settings, same shape as the consent-manager section of transcend.yml. ' +
      'Only keys you pass are changed.',
  ),
});
export type WriteConsentManagerInput = z.infer<typeof WriteConsentManagerSchema>;

export function createConsentWriteConsentManagerTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_write_consent_manager',
    description:
      'Create or update the consent manager settings, like the consent-manager section of ' +
      'transcend.yml. Only keys you pass are changed. Also syncs experiences, UI variants and ' +
      'UI themes when passed. Creates the consent manager if the organization has none. ' +
      'Returns success and errors.',
    category: 'Consent Management',
    readOnly: false,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    zodSchema: WriteConsentManagerSchema,
    handler: async ({ consentManager }) => {
      const input = decodeYmlRecord<ConsentManagerSettings>(
        ConsentManagerInput,
        consentManager,
        'consent-manager',
      );
      return pushYmlSection(clients, { 'consent-manager': input }, 1);
    },
  });
}

import {
  createCollectedLogger,
  createGraphqlRequestClient,
  createToolResult,
  decodeYmlItems,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ConsentManagerInput, syncConsentManager } from '@transcend-io/sdk';

export const WriteConsentManagerSchema = z.object({
  consentManager: z
    .record(z.string(), z.unknown())
    .describe(
      'Consent manager settings, same shape as the consent-manager section of transcend.yml. ' +
        'Optional keys include domains, partition, version, consentPrecedence, ' +
        'unknownRequestPolicy, experiences, consentVariants, consentThemes and theme. ' +
        'Use config_get_schema for the full schema.',
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
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WriteConsentManagerSchema,
    handler: async ({ consentManager }) => {
      const input = decodeYmlItems(ConsentManagerInput, [consentManager])[0]!;
      const { logger, logs } = createCollectedLogger();
      try {
        await syncConsentManager(createGraphqlRequestClient(clients.graphql), input, { logger });
      } catch (error) {
        return createToolResult(true, {
          success: false,
          errors: [
            {
              resource: 'consent-manager',
              message: error instanceof Error ? error.message : String(error),
            },
          ],
          logs,
        });
      }
      return createToolResult(true, { success: true, errors: [] });
    },
  });
}

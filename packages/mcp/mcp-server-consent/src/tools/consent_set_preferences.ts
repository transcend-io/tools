import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

const PurposeConsentSchema = z.object({
  purpose: z.string(),
  enabled: z.boolean(),
});

const SetPreferencesSchema = z.object({
  identifier: z.string().optional().describe('User identifier'),
  partition: z.string().describe('Partition/organization context'),
  purposes: z.array(PurposeConsentSchema).describe('Array of purpose consent settings'),
  confirmed: z.boolean().optional().describe('Whether consent was explicitly confirmed'),
});

export function createConsentSetPreferencesTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'consent_set_preferences',
    description: 'Set consent preferences for a user (client-side sync)',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates consent preferences for the user',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: SetPreferencesSchema,
    handler: async (args) => {
      const { partition, identifier, purposes, confirmed } = args as z.infer<
        typeof SetPreferencesSchema
      >;
      try {
        const result = await rest.syncConsent({
          partition,
          identifier,
          purposes: purposes.map((p) => ({
            purpose: p.purpose,
            enabled: p.enabled,
          })),
          confirmed,
        });
        return createToolResult(true, {
          ...result,
          message: 'Consent preferences synced successfully',
        });
      } catch (error) {
        return createToolResult(
          false,
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}

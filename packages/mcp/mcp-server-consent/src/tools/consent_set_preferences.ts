import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

export const PurposeConsentSchema = z.object({
  purpose: z.string().describe('Purpose slug'),
  enabled: z.boolean().describe('Whether consent is granted'),
});
export type PurposeConsentInput = z.infer<typeof PurposeConsentSchema>;

export const SetPreferencesSchema = z.object({
  identifier: z.string().optional().describe('User identifier'),
  partition: z.string().describe('Partition/organization context'),
  purposes: z.array(PurposeConsentSchema).describe('Array of purpose consent settings'),
  confirmed: z.boolean().optional().describe('Whether consent was explicitly confirmed'),
});
export type SetPreferencesInput = z.infer<typeof SetPreferencesSchema>;

export function createConsentSetPreferencesTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'consent_set_preferences',
    description: 'Set consent preferences for a user (client-side sync)',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates consent preferences for the user',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: SetPreferencesSchema,
    handler: async ({ partition, identifier, purposes, confirmed }) => {
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
    },
  });
}

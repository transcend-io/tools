import {
  createCollectedLogger,
  createGraphqlRequestClient,
  createToolResult,
  decodeYmlItems,
  defineTool,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ConsentPurpose, syncPreferenceTopics, syncPurposes } from '@transcend-io/sdk';

export const WritePurposesSchema = z.object({
  purposes: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(100)
    .describe(
      'Purposes, same shape as the purposes section of transcend.yml. Each needs trackingType, ' +
        'title and name. Optional: description, is-active, configurable, display-order, ' +
        'preference-topics. Use config_get_schema for the full schema.',
    ),
});
export type WritePurposesInput = z.infer<typeof WritePurposesSchema>;

export function createConsentWritePurposesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_write_purposes',
    description:
      'Create or update consent purposes, matched by trackingType, like the purposes section of ' +
      'transcend.yml. Also syncs the preference topics nested in each purpose. Purposes missing ' +
      'from the list are not deleted. Returns success and errors.',
    category: 'Consent Management',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    zodSchema: WritePurposesSchema,
    handler: async ({ purposes: rawPurposes }) => {
      const purposes = decodeYmlItems(ConsentPurpose, rawPurposes);
      const client = createGraphqlRequestClient(clients.graphql);
      const { logger, logs } = createCollectedLogger();
      const errors: { resource: string; message: string }[] = [];

      const { success, purposeIdByTrackingType } = await syncPurposes(client, purposes, {
        logger,
      });
      if (!success) {
        errors.push({ resource: 'purposes', message: 'Failed to sync one or more purposes' });
      }

      const topics = purposes.flatMap((purpose) =>
        (purpose['preference-topics'] ?? []).map((topic) => ({
          ...topic,
          'tracking-type': purpose.trackingType,
        })),
      );
      if (topics.length > 0) {
        const topicsSuccess = await syncPreferenceTopics(client, topics, {
          logger,
          purposeIdByTrackingType,
        });
        if (!topicsSuccess) {
          errors.push({
            resource: 'preference-topics',
            message: 'Failed to sync one or more preference topics',
          });
        }
      }

      return createToolResult(true, {
        success: errors.length === 0,
        errors,
        purposes: purposes.length,
        preferenceTopics: topics.length,
        ...(errors.length > 0 && { logs }),
      });
    },
  });
}

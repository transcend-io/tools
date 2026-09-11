import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';

import {
  isPreferenceMutationSuccessful,
  preferenceMutationFailureCount,
  preferenceMutationToolResult,
} from './mutation-success.js';
import { UpsertRecordSchema } from './preference-schemas.js';

export const UpsertPreferencesSchema = z.object({
  records: z.array(UpsertRecordSchema).min(1).describe('Preference records to upsert'),
  skipWorkflowTriggers: z
    .boolean()
    .optional()
    .describe('When true, skip workflow triggers for these updates'),
});
export type UpsertPreferencesInput = z.infer<typeof UpsertPreferencesSchema>;

export function createPreferencesUpsertTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'preferences_upsert',
    description:
      'Batch upsert consent preference records for multiple users. Call preferences_list_partitions ' +
      'first and pass purposes[].enabled (boolean) — Preference Store rejects a "consent" field.',
    category: 'Preference Management',
    readOnly: false,
    confirmation: {
      hint:
        'Records or overwrites stored consent preferences for these identifiers. Purpose ' +
        'settings take effect for compliance and downstream systems. Check partition, ' +
        'identifiers, and purpose values in the call arguments before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: UpsertPreferencesSchema,
    handler: async ({ records, skipWorkflowTriggers }) => {
      const result = await rest.upsertPreferences({
        records,
        skipWorkflowTriggers,
      });

      const ok = isPreferenceMutationSuccessful(result);
      const failureCount = preferenceMutationFailureCount(result);
      return preferenceMutationToolResult(
        createToolResult,
        ok,
        {
          ...result,
          recordsProcessed: records.length,
          message: ok
            ? `Successfully upserted ${records.length} preference record(s)`
            : `Preference upsert completed with ${failureCount} failure(s)`,
        },
        `Preference upsert failed for ${failureCount} record(s)`,
      );
    },
  });
}

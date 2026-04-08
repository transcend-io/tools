import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import { UpsertPreferencesSchema } from '../schemas.js';

export function createPreferencesUpsertTool(clients: ToolClients): ToolDefinition {
  const { rest } = clients;
  return {
    name: 'preferences_upsert',
    description: 'Batch upsert consent preference records for multiple users',
    category: 'Preference Management',
    readOnly: false,
    confirmationHint: 'Creates or updates preference records for users',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        partition: {
          type: 'string',
          description: 'Partition/organization context',
        },
        records: {
          type: 'array',
          description: 'Array of preference records to upsert',
          items: {
            type: 'object',
          },
        },
      },
      required: ['partition', 'records'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpsertPreferencesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const records = parsed.data.records.map((record) => ({
          identifier: record.identifier,
          identifierType: record.identifierType,
          purposes: record.purposes.map((p) => ({
            purpose: p.purpose,
            enabled: p.enabled,
          })),
          confirmed: record.confirmed,
        }));

        const result = await rest.upsertPreferences({
          partition: parsed.data.partition,
          records,
        });

        return createToolResult(true, {
          ...result,
          recordsProcessed: records.length,
          message: `Successfully upserted ${result.count} preference records`,
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

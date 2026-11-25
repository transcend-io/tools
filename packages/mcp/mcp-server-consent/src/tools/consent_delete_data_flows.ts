import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { DELETE_DATA_FLOWS, type TranscendCliDeleteDataFlowsResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const DeleteDataFlowsSchema = z.object({
  ids: z
    .array(z.string())
    .min(1)
    .describe('Data flow IDs to permanently delete. Get IDs from consent_list_data_flows.'),
});
export type DeleteDataFlowsInput = z.infer<typeof DeleteDataFlowsSchema>;

/**
 * Permanently delete data flows by ID. Hidden from agents (`visibility: ['app']`);
 * intended for MCP App views that already collected an explicit user action.
 */
export function createConsentDeleteDataFlowsTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_delete_data_flows',
    description:
      'Permanently delete one or more data flows by ID. Irreversible — prefer ' +
      'consent_update_data_flows with isJunk=true to junk instead of delete. ' +
      'App-only: callable by MCP App views, not listed to agents.',
    category: 'Consent Management',
    readOnly: false,
    visibility: ['app'],
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: DeleteDataFlowsSchema,
    handler: async ({ ids }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const result = await clients.graphql.makeRequest<TranscendCliDeleteDataFlowsResponse>(
        DELETE_DATA_FLOWS,
        {
          input: { airgapBundleId, ids },
        },
      );
      const success = result.deleteDataFlows.success;
      return createToolResult(success, {
        deleted: ids.length,
        ids,
        success,
      });
    },
  });
}

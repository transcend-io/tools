import {
  createToolResult,
  z,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { ConsentMixin } from '../graphql.js';

const GetCookieStatsSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID (from consent_list_airgap_bundles)'),
});

export function createConsentGetTriageStatsTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as ConsentMixin;
  return {
    name: 'consent_get_triage_stats',
    description:
      'Get statistics on cookies and data flows: total, live (approved), needs review (triage), ' +
      'and junk counts. Useful for understanding triage backlog size.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GetCookieStatsSchema,
    handler: async (args) => {
      const { airgap_bundle_id } = args as z.infer<typeof GetCookieStatsSchema>;
      try {
        const stats = await graphql.getCookieStats(airgap_bundle_id);
        return createToolResult(true, stats);
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

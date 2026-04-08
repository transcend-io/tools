import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { ConsentMixin } from '../graphql.js';
import { GetCookieStatsSchema } from '../schemas.js';

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
    inputSchema: {
      type: 'object',
      properties: {
        airgap_bundle_id: {
          type: 'string',
          description: 'Airgap bundle ID (from consent_list_airgap_bundles)',
        },
      },
      required: ['airgap_bundle_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(GetCookieStatsSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const stats = await graphql.getCookieStats(parsed.data.airgap_bundle_id);
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

import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';

import type { ConsentMixin } from '../graphql.js';
import { ListTriageCookiesSchema } from '../schemas.js';

export function createConsentListTriageCookiesTool(clients: ToolClients): ToolDefinition {
  const graphql = clients.graphql as ConsentMixin;
  return {
    name: 'consent_list_triage_cookies',
    description:
      'List cookies in your consent manager. Use status=NEEDS_REVIEW to see cookies awaiting triage. ' +
      'Returns name, service, tracking purposes, activity (occurrences), junk status, and more. ' +
      'Requires an airgap_bundle_id (get one from consent_list_airgap_bundles).',
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
        limit: { type: 'number', description: 'Results per page (1-200, default: 50)' },
        offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
        status: {
          type: 'string',
          enum: ['NEEDS_REVIEW', 'LIVE'],
          description: 'Filter by status: NEEDS_REVIEW (triage) or LIVE (approved)',
        },
        is_junk: { type: 'boolean', description: 'Filter by junk status' },
        show_zero_activity: {
          type: 'boolean',
          description: 'Include items with zero activity (default: false)',
        },
        text: { type: 'string', description: 'Search text filter' },
        service: { type: 'string', description: 'Filter by service name' },
        order_field: {
          type: 'string',
          enum: ['name', 'createdAt', 'updatedAt'],
          description: 'Field to sort by',
        },
        order_direction: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          description: 'Sort direction',
        },
      },
      required: ['airgap_bundle_id'],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListTriageCookiesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const result = await graphql.listCookies({
          airgapBundleId: parsed.data.airgap_bundle_id,
          first: parsed.data.limit,
          offset: parsed.data.offset,
          status: parsed.data.status,
          isJunk: parsed.data.is_junk,
          showZeroActivity: parsed.data.show_zero_activity,
          text: parsed.data.text,
          service: parsed.data.service,
          orderBy:
            parsed.data.order_field && parsed.data.order_direction
              ? [{ field: parsed.data.order_field, direction: parsed.data.order_direction }]
              : undefined,
        });
        return createListResult(result.nodes, {
          totalCount: result.totalCount,
          hasNextPage: result.pageInfo?.hasNextPage,
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

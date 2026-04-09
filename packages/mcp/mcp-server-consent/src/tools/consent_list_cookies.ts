import {
  createListResult,
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus, OrderDirection } from '@transcend-io/privacy-types';
import { COOKIES, type TranscendCliCookiesResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import { ListCookiesSchema } from '../schemas.js';

export function createConsentListCookiesTool(clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_list_cookies',
    description:
      'List cookies in your consent manager. ' +
      'Requires a status filter: NEEDS_REVIEW for triage backlog, LIVE for approved cookies. ' +
      'Returns name, service, tracking purposes, activity (occurrences), junk status, and more.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Results per page (1-200, default: 50)' },
        offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
        status: {
          type: 'string',
          enum: Object.values(ConsentTrackerStatus),
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
          enum: Object.values(OrderDirection),
          description: 'Sort direction',
        },
      },
      required: ['status'],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListCookiesSchema, args);
      if (!parsed.success) return parsed.error;
      const {
        limit,
        offset,
        status,
        is_junk,
        show_zero_activity,
        text,
        service,
        order_field,
        order_direction,
      } = parsed.data;
      try {
        const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
        const data = await clients.graphql.makeRequest<TranscendCliCookiesResponse>(COOKIES, {
          input: { airgapBundleId },
          first: limit,
          offset,
          filterBy: {
            status,
            ...(is_junk !== undefined ? { isJunk: is_junk } : {}),
            ...(show_zero_activity !== undefined ? { showZeroActivity: show_zero_activity } : {}),
            ...(text ? { text } : {}),
            ...(service ? { service } : {}),
          },
          ...(order_field && order_direction
            ? { orderBy: [{ field: order_field, direction: order_direction }] }
            : {}),
        });

        return createListResult(data.cookies.nodes, {
          totalCount: data.cookies.totalCount,
          hasNextPage: (offset ?? 0) + data.cookies.nodes.length < data.cookies.totalCount,
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

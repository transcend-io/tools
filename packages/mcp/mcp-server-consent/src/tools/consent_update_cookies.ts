import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';
import {
  UPDATE_OR_CREATE_COOKIES,
  type TranscendUpdateCookieInputGql,
  type TranscendCliUpdateOrCreateCookiesResponse,
} from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';
import { UpdateCookiesSchema } from '../schemas.js';

export function createConsentUpdateCookiesTool(clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_update_cookies',
    description:
      'Update one or more cookies. Use to approve (status=LIVE), junk (is_junk=true), ' +
      'assign tracking purposes, or set a service. The cookie "name" field is the identifier ' +
      'for upsert — existing cookies with matching names will be updated.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates cookies in the consent manager',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        cookies: {
          type: 'array',
          description: 'Cookies to update',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Cookie name (identifier)' },
              tracking_purposes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tracking purpose slugs',
              },
              description: { type: 'string', description: 'Cookie description' },
              service: { type: 'string', description: 'Service name' },
              is_junk: { type: 'boolean', description: 'Mark as junk' },
              status: {
                type: 'string',
                enum: Object.values(ConsentTrackerStatus),
                description: 'Set status',
              },
            },
            required: ['name'],
          },
        },
      },
      required: ['cookies'],
    },
    handler: async (args) => {
      const parsed = validateArgs(UpdateCookiesSchema, args);
      if (!parsed.success) return parsed.error;
      const { cookies } = parsed.data;
      try {
        const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
        const cookieInputs: TranscendUpdateCookieInputGql[] = cookies.map((c) => ({
          name: c.name,
          ...(c.tracking_purposes ? { trackingPurposes: c.tracking_purposes } : {}),
          ...(c.description !== undefined ? { description: c.description } : {}),
          ...(c.service !== undefined ? { service: c.service } : {}),
          ...(c.is_junk !== undefined ? { isJunk: c.is_junk } : {}),
          ...(c.status !== undefined ? { status: c.status } : {}),
        }));

        await clients.graphql.makeRequest<TranscendCliUpdateOrCreateCookiesResponse>(
          UPDATE_OR_CREATE_COOKIES,
          {
            airgapBundleId,
            cookies: cookieInputs,
          },
        );

        return createToolResult(true, {
          updated: cookieInputs.length,
          cookies: cookieInputs.map((c) => ({
            name: c.name,
            status: c.status,
            isJunk: c.isJunk,
            trackingPurposes: c.trackingPurposes,
            service: c.service,
          })),
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

import {
  createToolResult,
  defineTool,
  z,
  type ToolClients,
  type UpdateCookieInput,
} from '@transcend-io/mcp-server-core';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';

import type { ConsentMixin } from '../graphql.js';

const ConsentTrackerStatusEnum = z.nativeEnum(ConsentTrackerStatus);

const UpdateCookieItemSchema = z.object({
  name: z.string().describe('Cookie name (used as the identifier for upsert)'),
  tracking_purposes: z
    .array(z.string())
    .optional()
    .describe('Tracking purpose slugs (e.g., "Advertising", "Analytics")'),
  description: z.string().optional().describe('Cookie description'),
  service: z.string().optional().describe('Service/integration name'),
  is_junk: z.boolean().optional().describe('Mark as junk'),
  status: ConsentTrackerStatusEnum.optional().describe(
    'Set status to LIVE (approve) or NEEDS_REVIEW',
  ),
});

const UpdateCookiesSchema = z.object({
  airgap_bundle_id: z.string().describe('Airgap bundle ID'),
  cookies: z.array(UpdateCookieItemSchema).min(1).describe('Cookies to update'),
});

export function createConsentUpdateCookiesTool(clients: ToolClients) {
  const graphql = clients.graphql as ConsentMixin;
  return defineTool({
    name: 'consent_update_cookies',
    description:
      'Update one or more cookies. Use to approve (status=LIVE), junk (is_junk=true), ' +
      'assign tracking purposes, or set a service. The cookie "name" field is the identifier ' +
      'for upsert — existing cookies with matching names will be updated.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates cookies in the consent manager',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: UpdateCookiesSchema,
    handler: async ({ airgap_bundle_id, cookies }) => {
      try {
        const cookieInputs: UpdateCookieInput[] = cookies.map((c) => ({
          name: c.name,
          ...(c.tracking_purposes ? { trackingPurposes: c.tracking_purposes } : {}),
          ...(c.description !== undefined ? { description: c.description } : {}),
          ...(c.service !== undefined ? { service: c.service } : {}),
          ...(c.is_junk !== undefined ? { isJunk: c.is_junk } : {}),
          ...(c.status !== undefined ? { status: c.status } : {}),
        }));
        await graphql.updateCookies(airgap_bundle_id, cookieInputs);
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
  });
}

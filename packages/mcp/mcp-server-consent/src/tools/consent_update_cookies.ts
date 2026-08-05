import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { ConsentTrackerStatus } from '@transcend-io/privacy-types';

import { UpdateOrCreateCookiesDoc, type UpdateOrCreateCookieInput } from '../graphql.js';
import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const UpdateCookieItemSchema = z.object({
  name: z.string().describe('Cookie name (used as the identifier for upsert)'),
  trackingPurposes: z
    .array(z.string())
    .optional()
    .describe('Tracking purpose slugs (e.g., "Advertising", "Analytics")'),
  description: z.string().optional().describe('Cookie description'),
  service: z.string().optional().describe('Service/integration name'),
  isJunk: z.boolean().optional().describe('Mark as junk'),
  status: z
    .nativeEnum(ConsentTrackerStatus)
    .optional()
    .describe('Set status to LIVE (approve) or NEEDS_REVIEW'),
});
export type UpdateCookieItemInput = z.infer<typeof UpdateCookieItemSchema>;

export const UpdateCookiesSchema = z.object({
  cookies: z.array(UpdateCookieItemSchema).min(1).describe('Cookies to update'),
});
export type UpdateCookiesInput = z.infer<typeof UpdateCookiesSchema>;

export function createConsentUpdateCookiesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_update_cookies',
    description:
      'Update one or more cookies. Use to approve (status=LIVE), junk (isJunk=true), ' +
      'assign tracking purposes, or set a service. The cookie "name" field is the identifier ' +
      'for upsert — existing cookies with matching names will be updated.',
    category: 'Consent Management',
    readOnly: false,
    confirmationHint: 'Updates cookies in the consent manager',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    zodSchema: UpdateCookiesSchema,
    handler: async ({ cookies }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const cookieInputs: UpdateOrCreateCookieInput[] = cookies.map((c) => ({
        name: c.name,
        ...(c.trackingPurposes ? { trackingPurposes: c.trackingPurposes } : {}),
        ...(c.description !== undefined ? { description: c.description } : {}),
        ...(c.service !== undefined ? { service: c.service } : {}),
        ...(c.isJunk !== undefined ? { isJunk: c.isJunk } : {}),
        ...(c.status !== undefined ? { status: c.status } : {}),
      }));
      await clients.graphql.makeRequest(UpdateOrCreateCookiesDoc, {
        airgapBundleId,
        cookies: cookieInputs,
      });
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
    },
  });
}

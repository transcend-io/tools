import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { DELETE_COOKIES, type TranscendCliDeleteCookiesResponse } from '@transcend-io/sdk';

import { resolveAirgapBundleId } from '../resolveAirgapBundleId.js';

export const DeleteCookiesSchema = z.object({
  ids: z
    .array(z.string())
    .min(1)
    .describe('Cookie IDs to permanently delete. Get IDs from consent_list_cookies.'),
});
export type DeleteCookiesInput = z.infer<typeof DeleteCookiesSchema>;

/**
 * Permanently delete cookies by ID. Hidden from agents (`visibility: ['app']`);
 * intended for MCP App views that already collected an explicit user action.
 */
export function createConsentDeleteCookiesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_delete_cookies',
    description:
      'Permanently delete one or more cookies by ID. Irreversible — prefer ' +
      'consent_update_cookies with isJunk=true to junk instead of delete. ' +
      'App-only: callable by MCP App views, not listed to agents.',
    category: 'Consent Management',
    readOnly: false,
    visibility: ['app'],
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: DeleteCookiesSchema,
    handler: async ({ ids }) => {
      const airgapBundleId = await resolveAirgapBundleId(clients.graphql);
      const result = await clients.graphql.makeRequest<TranscendCliDeleteCookiesResponse>(
        DELETE_COOKIES,
        {
          input: { airgapBundleId, ids },
        },
      );
      const success = result.deleteCookies.success;
      return createToolResult(success, {
        deleted: ids.length,
        ids,
        success,
      });
    },
  });
}

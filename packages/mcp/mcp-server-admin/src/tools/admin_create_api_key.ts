import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { ScopeName } from '@transcend-io/privacy-types';

import type { AdminMixin } from '../graphql.js';

const SCOPE_NAME_VALUES = new Set<string>(Object.values(ScopeName));

function isScopeName(value: string): value is ScopeName {
  return SCOPE_NAME_VALUES.has(value);
}

export const CreateApiKeySchema = z.object({
  title: z.string().describe('Name/title for the API key'),
  scopes: z
    .array(
      z.string().refine(isScopeName, {
        message: 'Unknown scope. Call admin_list_scopes for valid ScopeName values.',
      }),
    )
    .describe('Permission scopes for the key. Call admin_list_scopes for valid ScopeName values.'),
  dataSilos: z
    .array(z.string())
    .optional()
    .describe('Array of data silo IDs to assign the key to (optional)'),
});
export type CreateApiKeyInput = Omit<z.infer<typeof CreateApiKeySchema>, 'scopes'> & {
  /** Permission scopes for the key */
  scopes: ScopeName[];
};

export function createAdminCreateApiKeyTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_create_api_key',
    description:
      'Create a new API key with specified scopes. WARNING: The token is only shown once! ' +
      'Some scopes inherit dependencies (manageDataMap requires viewDataMap). ' +
      'Use readOnly for view-only access or fullAdmin for unrestricted access. ' +
      'Common scopes: manageApiKeys, manageDataMap, manageConsentManager. ' +
      'Call admin_list_scopes for valid names, titles, and dependencies.',
    category: 'Admin',
    readOnly: false,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CreateApiKeySchema,
    handler: async ({ title, scopes, dataSilos }) => {
      const created = await graphql.createApiKey({ title, scopes, dataSilos });
      const { token, ...apiKey } = created;
      return createToolResult(true, {
        apiKey,
        token,
        warning: 'IMPORTANT: Save this token now! It will not be shown again.',
        message: `API key "${title}" created successfully`,
      });
    },
  });
}

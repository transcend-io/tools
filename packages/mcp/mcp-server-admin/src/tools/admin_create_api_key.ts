import {
  ApiKeySchema,
  createToolResult,
  defineTool,
  envelopeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { ScopeName, TRANSCEND_SCOPES } from '@transcend-io/privacy-types';

import type { AdminMixin } from '../graphql.js';

const scopeSummary = Object.entries(TRANSCEND_SCOPES)
  .map(([name, def]) => {
    const deps = def.dependencies.length > 0 ? ` (requires: ${def.dependencies.join(', ')})` : '';
    return `- ${name}: ${def.title} — ${def.description}${deps}`;
  })
  .join('\n');

export const CreateApiKeySchema = z.object({
  title: z.string().describe('Name/title for the API key'),
  scopes: z.array(z.nativeEnum(ScopeName)).describe('Array of permission scopes for the key'),
  data_silos: z
    .array(z.string())
    .optional()
    .describe('Array of data silo IDs to assign the key to (optional)'),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

export function createAdminCreateApiKeyTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_create_api_key',
    description:
      'Create a new API key with specified scopes. WARNING: The token is only shown once! ' +
      'Scopes control what the key can access. Some scopes inherit dependencies — ' +
      'for example, manageDataMap requires viewDataMap. ' +
      'Use "readOnly" for view-only access to all resources, or "fullAdmin" for unrestricted access. ' +
      'Common scopes: manageApiKeys, manageDataMap, manageConsentManager, makeDataSubjectRequest, ' +
      'connectDataSilos, manageAssessments, manageDataInventory.\n\n' +
      'Available scopes:\n' +
      scopeSummary,
    category: 'Admin',
    readOnly: false,
    confirmationHint: 'Creates a new API key with the specified scopes',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: CreateApiKeySchema,
    outputZodSchema: envelopeSchema(
      z.object({
        apiKey: ApiKeySchema,
        token: z.string(),
        warning: z.string(),
        message: z.string(),
      }),
    ),
    handler: async ({ title, scopes, data_silos }) => {
      const result = await graphql.createApiKey({
        title,
        scopes,
        dataSilos: data_silos,
      });
      return createToolResult(true, {
        apiKey: result.apiKey,
        token: result.token,
        warning: 'IMPORTANT: Save this token now! It will not be shown again.',
        message: `API key "${title}" created successfully`,
      });
    },
  });
}

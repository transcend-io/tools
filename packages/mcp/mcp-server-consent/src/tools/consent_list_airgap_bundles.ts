import {
  createToolResult,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-core';
import {
  FETCH_CONSENT_MANAGER,
  type TranscendCliFetchConsentManagerResponse,
} from '@transcend-io/sdk';

export const ListAirgapBundlesSchema = EmptySchema;
export type ListAirgapBundlesInput = Record<string, never>;

export function createConsentListAirgapBundlesTool(clients: ToolClients) {
  return defineTool({
    name: 'consent_list_airgap_bundles',
    description:
      'Get the consent manager (airgap bundle) configured for your organization. ' +
      'Returns the bundle ID, URLs, configuration, and domains.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ListAirgapBundlesSchema,
    handler: async (_args) => {
      const data = await clients.graphql.makeRequest<TranscendCliFetchConsentManagerResponse>(
        FETCH_CONSENT_MANAGER,
        {},
      );
      return createToolResult(true, data.consentManager.consentManager);
    },
  });
}

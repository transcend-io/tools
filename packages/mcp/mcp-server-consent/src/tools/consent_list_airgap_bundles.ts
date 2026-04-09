import {
  createToolResult,
  validateArgs,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-core';
import {
  FETCH_CONSENT_MANAGER,
  type TranscendCliFetchConsentManagerResponse,
} from '@transcend-io/sdk';

import { ListAirgapBundlesSchema } from '../schemas.js';

export function createConsentListAirgapBundlesTool(clients: ToolClients): ToolDefinition {
  return {
    name: 'consent_list_airgap_bundles',
    description:
      'Get the consent manager (airgap bundle) configured for your organization. ' +
      'Returns the bundle ID, URLs, configuration, and domains.',
    category: 'Consent Management',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args) => {
      const parsed = validateArgs(ListAirgapBundlesSchema, args);
      if (!parsed.success) return parsed.error;
      try {
        const data = await clients.graphql.makeRequest<TranscendCliFetchConsentManagerResponse>(
          FETCH_CONSENT_MANAGER,
          {},
        );

        return createToolResult(true, data.consentManager.consentManager);
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

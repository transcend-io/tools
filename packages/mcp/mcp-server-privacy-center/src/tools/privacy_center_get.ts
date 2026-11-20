import {
  createCollectedLogger,
  createGraphqlRequestClient,
  createToolResult,
  defineTool,
  EmptySchema,
  type ToolClients,
} from '@transcend-io/mcp-server-base';
import { fetchAllPrivacyCenters } from '@transcend-io/sdk';

export function createPrivacyCenterGetTool(clients: ToolClients) {
  return defineTool({
    name: 'privacy_center_get',
    description:
      'Get privacy center configuration for your organization: pages, locales, theme, and ' +
      'footer links. Same as the privacy-center section of `transcend inventory pull`.',
    category: 'Privacy Center',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    handler: async (_args) => {
      const { logger } = createCollectedLogger();
      const centers = await fetchAllPrivacyCenters(createGraphqlRequestClient(clients.graphql), {
        logger,
      });
      if (centers.length === 0) {
        return createToolResult(true, {
          found: false,
          message: 'No privacy center configured for this organization',
        });
      }
      return createToolResult(true, { found: true, privacyCenter: centers[0] });
    },
  });
}

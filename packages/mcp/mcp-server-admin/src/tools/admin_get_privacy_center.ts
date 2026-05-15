import {
  createToolResult,
  defineTool,
  EmptySchema,
  envelopeSchema,
  PrivacyCenterSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

import type { AdminMixin } from '../graphql.js';

export function createAdminGetPrivacyCenterTool(clients: ToolClients) {
  const graphql = clients.graphql as AdminMixin;
  return defineTool({
    name: 'admin_get_privacy_center',
    description: 'Get privacy center configuration for your organization',
    category: 'Admin',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: EmptySchema,
    outputZodSchema: envelopeSchema(
      z.discriminatedUnion('found', [
        z.object({ found: z.literal(false), message: z.string() }),
        z.object({ found: z.literal(true), privacyCenter: PrivacyCenterSchema }),
      ]),
    ),
    handler: async (_args) => {
      const result = await graphql.getPrivacyCenter();
      if (!result) {
        return createToolResult(true, {
          found: false,
          message: 'No privacy center configured for this organization',
        });
      }
      return createToolResult(true, { found: true, privacyCenter: result });
    },
  });
}

import {
  createToolResult,
  defineTool,
  envelopeSchema,
  RequestDetailsSchema,
  type ToolClients,
  z,
} from '@transcend-io/mcp-server-base';

import type { DSRMixin } from '../graphql.js';

export const getDetailsSchema = z.object({
  request_id: z.string().describe('ID of the DSR to retrieve'),
});
export type GetDetailsInput = z.infer<typeof getDetailsSchema>;

export function createDsrGetDetailsTool(clients: ToolClients) {
  const graphql = clients.graphql as DSRMixin;

  return defineTool({
    name: 'dsr_get_details',
    description: 'Get detailed information about a specific Data Subject Request',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: getDetailsSchema,
    outputZodSchema: envelopeSchema(RequestDetailsSchema),
    handler: async ({ request_id }) => {
      const result = await graphql.getRequest(request_id);
      return createToolResult(true, result);
    },
  });
}

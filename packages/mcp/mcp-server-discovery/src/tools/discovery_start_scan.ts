import {
  ClassificationScanSchema,
  createToolResult,
  defineTool,
  envelopeSchema,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

import type { DiscoveryMixin } from '../graphql.js';

export const StartScanSchema = z.object({
  name: z.string().describe('Name for the classification scan'),
  data_silo_id: z.string().optional().describe('ID of the data silo to scan (optional)'),
  type: z.string().optional().describe('Type of scan (optional)'),
});
export type StartScanInput = z.infer<typeof StartScanSchema>;

export function createDiscoveryStartScanTool(clients: ToolClients) {
  const graphql = clients.graphql as DiscoveryMixin;
  return defineTool({
    name: 'discovery_start_scan',
    description: 'Start a new data classification scan on a data silo.',
    category: 'Data Discovery',
    readOnly: false,
    confirmationHint: 'Starts a new classification scan on the data silo',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    zodSchema: StartScanSchema,
    outputZodSchema: envelopeSchema(
      z.object({
        scan: ClassificationScanSchema,
        message: z.string(),
      }),
    ),
    handler: async ({ name, data_silo_id, type }) => {
      const result = await graphql.startClassificationScan({
        name,
        dataSiloId: data_silo_id,
        type,
      });
      return createToolResult(true, {
        scan: result,
        message: `Classification scan "${name}" started successfully`,
      });
    },
  });
}

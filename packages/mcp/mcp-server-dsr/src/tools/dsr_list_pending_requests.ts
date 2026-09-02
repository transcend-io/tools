import { createToolResult, defineTool, type ToolClients, z } from '@transcend-io/mcp-server-base';

export const listPendingRequestsSchema = z.object({
  dataSiloId: z
    .string()
    .describe(
      'UUID of the data silo whose pending jobs to list (from dsr_list_request_data_silos or inventory). ' +
        'The authenticated Transcend API key MUST be associated with this same data silo ' +
        '(Admin → Developer → API Keys → linked Data Silos). Do not pass a silo the key is not linked to.',
    ),
  requestType: z
    .enum(['ACCESS', 'ERASURE'])
    .describe('Pending job type: ACCESS (fulfillment) or ERASURE (fulfillment)'),
});
export type ListPendingRequestsInput = z.infer<typeof listPendingRequestsSchema>;

function isPendingRequestsAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b401\b/i.test(message) || /API key invalid/i.test(message);
}

export function createDsrListPendingRequestsTool(clients: ToolClients) {
  const { rest } = clients;

  return defineTool({
    name: 'dsr_list_pending_requests',
    description:
      'List outstanding ACCESS or ERASURE jobs waiting on one data silo (integration), oldest first. ' +
      'Each item carries the requestId, the identifier to process, and the Sombra-signed nonce that ' +
      'dsr_respond_access, dsr_respond_erasure, and dsr_enrich_identifiers require for that job. ' +
      'Requires Sombra and a Transcend API key linked to this data silo; ' +
      'OAuth-only auth returns 401.',
    category: 'DSR Automation',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    requireSombra: true,
    zodSchema: listPendingRequestsSchema,
    handler: async ({ dataSiloId, requestType }) => {
      try {
        const result = await rest.getPendingRequests(dataSiloId, requestType);
        const items = result.items ?? [];
        return createToolResult(true, {
          items,
          count: items.length,
          message:
            items.length === 0
              ? `No pending ${requestType} jobs for data silo ${dataSiloId}`
              : `Found ${items.length} pending ${requestType} job(s). Use each item's nonce field for respond/enrich.`,
        });
      } catch (error) {
        if (isPendingRequestsAuthError(error)) {
          return createToolResult(
            false,
            undefined,
            'Unauthorized for pending requests on this data silo. Use a Transcend API key ' +
              `(TRANSCEND_API_KEY) that is associated with data silo ${dataSiloId} ` +
              '(Admin → Developer → API Keys → linked Data Silos). OAuth-only auth is not sufficient.',
          );
        }
        throw error;
      }
    },
  });
}

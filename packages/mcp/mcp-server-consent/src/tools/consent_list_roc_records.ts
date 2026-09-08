import {
  createToolResult,
  defineTool,
  ErrorCode,
  ToolError,
  z,
  type ToolClients,
} from '@transcend-io/mcp-server-base';

/** Minimum Sombra gateway version that serves POST /v1/preferences/{partition}/consent-records. */
export const MIN_SOMBRA_VERSION_FOR_CONSENT_RECORDS = '7.578.4';

export const ConsentListRocRecordsSchema = z.object({
  partition: z
    .string()
    .describe('The consent partition (airgap bundle id) the lookup is scoped to'),
  identifier: z.string().describe('The identifier to query'),
  identifierType: z
    .string()
    .describe('The type of the identifier to query: email, user_id, phone, etc.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Maximum number of records to return (1-200); omit to return the full timeline'),
  includeRawRequest: z.boolean().describe('Whether to include the raw request in the response'),
});
export type ConsentListRocRecordsInput = z.infer<typeof ConsentListRocRecordsSchema>;

/**
 * Creates a tool that lists Record of Consent (ROC) records for a given user in a partition.
 * ROC contains a user's historical, append only consent changes for a given partition.
 * We only store records for a year after the event. Records are stored in descending order by timestamp.
 *
 * @param clients - The tool clients
 * @returns The tool function
 */
export function createConsentListRocRecordsTool(clients: ToolClients) {
  const { rest } = clients;
  return defineTool({
    name: 'consent_list_roc_records',
    description: 'List all ROC records for a given user in a partition.',
    category: 'Consent Management',
    readOnly: true,
    requireAuth: true,
    requireSombra: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: ConsentListRocRecordsSchema,
    handler: async ({
      partition,
      identifier: inputIdentifier,
      identifierType,
      limit,
      includeRawRequest,
    }) => {
      const identifier = { name: identifierType, value: inputIdentifier };
      let result;
      try {
        result = await rest.listRocRecords({ partition, identifier, limit, includeRawRequest });
      } catch (error) {
        // This route is only available on Sombra >= 7.578.4.
        if (error instanceof ToolError && error.code === ErrorCode.NOT_FOUND) {
          throw new ToolError(
            ErrorCode.NOT_FOUND,
            `Consent-record lookup is unavailable on this Sombra gateway. This route requires ` +
              `Sombra >= ${MIN_SOMBRA_VERSION_FOR_CONSENT_RECORDS}; self-hosted gateways below ` +
              `that version do not serve it. Original error: ${error.message}`,
            false,
          );
        }
        throw error;
      }

      if (result.nodes.length === 0) {
        return createToolResult(true, {
          found: false,
          message: 'No ROC records found for this identifier',
        });
      }
      return createToolResult(true, {
        records: result.nodes,
        containsInitialRecord: result.containsInitialRecord,
      });
    },
  });
}

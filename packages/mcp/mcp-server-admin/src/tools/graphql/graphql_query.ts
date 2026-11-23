import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { OperationTypeNode } from 'graphql';

import { capGraphqlResult, prepareGraphqlOperation } from './operation.js';

const MAX_QUERY_CHARS = 20_000;

export const GraphqlQuerySchema = z.object({
  query: z.string().min(1).max(MAX_QUERY_CHARS).describe('Single read-only GraphQL query.'),
  variables: z.record(z.string(), z.unknown()).optional().describe('Query variables.'),
});
export type GraphqlQueryInput = z.infer<typeof GraphqlQuerySchema>;

export function createGraphqlQueryTool(clients: ToolClients) {
  return defineTool({
    name: 'graphql_query',
    description: 'Read-only GraphQL query for the signed-in org when no MCP tool exists.',
    category: 'GraphQL',
    readOnly: true,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    zodSchema: GraphqlQuerySchema,
    handler: async ({ query, variables }) => {
      prepareGraphqlOperation(query, OperationTypeNode.QUERY);
      const data = await clients.graphql.makeRequest<Record<string, unknown>>(
        query,
        variables ?? {},
      );
      const capped = capGraphqlResult(data);
      return createToolResult(true, {
        data: capped.data,
        ...(capped.truncated && { truncated: true }),
      });
    },
  });
}

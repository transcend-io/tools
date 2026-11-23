import { createToolResult, defineTool, z, type ToolClients } from '@transcend-io/mcp-server-base';
import { OperationTypeNode } from 'graphql';

import { capGraphqlResult, prepareGraphqlOperation } from './operation.js';

const MAX_MUTATION_CHARS = 20_000;

export const GraphqlMutateSchema = z.object({
  query: z.string().min(1).max(MAX_MUTATION_CHARS).describe('Single GraphQL mutation.'),
  variables: z.record(z.string(), z.unknown()).optional().describe('Mutation variables.'),
});
export type GraphqlMutateInput = z.infer<typeof GraphqlMutateSchema>;

export function createGraphqlMutateTool(clients: ToolClients) {
  return defineTool({
    name: 'graphql_mutate',
    description: 'GraphQL mutation for the signed-in org when no MCP write tool exists.',
    category: 'GraphQL',
    readOnly: false,
    confirmation: {
      hint:
        'Runs a raw GraphQL mutation that can create, change, or delete any data the signed-in ' +
        'user can access. Check the mutation text and variables before agreeing.',
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    zodSchema: GraphqlMutateSchema,
    handler: async ({ query, variables }) => {
      prepareGraphqlOperation(query, OperationTypeNode.MUTATION);
      const data = await clients.graphql.makeRequest<Record<string, unknown>>(
        query,
        variables ?? {},
        { retries: 0 },
      );
      const capped = capGraphqlResult(data);
      return createToolResult(true, {
        data: capped.data,
        ...(capped.truncated && { truncated: true }),
      });
    },
  });
}

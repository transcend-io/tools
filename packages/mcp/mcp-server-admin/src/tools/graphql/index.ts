import {
  graphqlMutateToolsEnabled,
  graphqlReadToolsEnabled,
  type ToolClients,
  type ToolDefinition,
} from '@transcend-io/mcp-server-base';

import { createGraphqlInspectSchemaTool } from './graphql_inspect_schema.js';
import { createGraphqlMutateTool } from './graphql_mutate.js';
import { createGraphqlQueryTool } from './graphql_query.js';

/** GraphQL fallback tools, gated by {@link TRANSCEND_MCP_GRAPHQL_TOOLS_ENV}. */
export function getGraphqlTools(clients: ToolClients): ToolDefinition[] {
  if (!graphqlReadToolsEnabled()) {
    return [];
  }
  const tools: ToolDefinition[] = [
    createGraphqlInspectSchemaTool(clients),
    createGraphqlQueryTool(clients),
  ];
  if (graphqlMutateToolsEnabled()) {
    tools.push(createGraphqlMutateTool(clients));
  }
  return tools;
}

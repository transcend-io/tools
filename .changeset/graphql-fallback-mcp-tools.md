---
'@transcend-io/mcp-server-admin': minor
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

Add GraphQL fallback tools (`graphql_inspect_schema`, `graphql_query`, `graphql_mutate`) so agents can reach Transcend API capabilities that do not have a dedicated MCP tool yet. Control availability with `TRANSCEND_MCP_GRAPHQL_TOOLS` (`all`, `read`, or `off`).
---
"@transcend-io/mcp-server-consent": patch
---

Migrate all consent MCP GraphQL operations to the typed `graphql()` codegen path (matching the other MCP servers) instead of importing plain `gql` strings and hand-written response types from `@transcend-io/sdk`. Operations now live in `src/graphql.ts` and are validated against the committed `schema.graphql` at compile time, so schema drift fails `tsc` rather than surfacing as a runtime error. No change to tool behavior.

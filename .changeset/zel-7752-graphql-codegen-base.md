---
'@transcend-io/mcp-server-base': minor
---

Add GraphQL Code Generator foundation and supporting utilities.

- `TranscendGraphQLBase.makeRequest` now accepts a `TypedDocumentNode` in
  addition to a string query. When passed a typed document, the result is
  inferred from the node's variable/result types so callers get end-to-end
  type safety against the staging schema.
- New `CursorPaginationSchema` and `OffsetPaginationSchema` are exported
  for tools that mirror the two pagination styles Transcend's GraphQL API
  uses. The legacy combined `PaginationSchema` is now deprecated; prefer
  the cursor/offset variants.
- `defineTool` now recursively validates that every input field (at any
  nesting depth) carries a non-empty Zod description, throwing at tool
  construction otherwise. The reusable `collectMissingDescriptions` helper
  backs both this check and the repo-wide audit test.

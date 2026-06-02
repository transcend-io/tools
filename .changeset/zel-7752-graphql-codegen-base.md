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
- New `withDescriptions(schema, descriptions)` helper enforces, at both
  TypeScript and runtime, that every field on a Zod input schema carries
  a non-empty description. Use this when wrapping schemas generated from
  GraphQL `input` types so LLM clients always have a description to read.

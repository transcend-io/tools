---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-discovery': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-preferences': patch
'@transcend-io/mcp-server-workflows': patch
'@transcend-io/mcp': patch
---

Add output Zod schemas to every MCP tool. The `ToolDefinition` interface now requires an `outputZodSchema` field, validated handler returns are surfaced as `structuredContent` on every `CallToolResult`, and `tools/list` responses now expose `outputSchema` derived from the same Zod schema. Validation is non-throwing during rollout — drift logs to stderr but the raw return is still surfaced as `structuredContent`.

New helpers exported from `@transcend-io/mcp-server-base`: `envelopeSchema`, `listEnvelopeSchema`, `paginatedListSchema`, `successEnvelopeSchema`, `errorEnvelopeSchema`, plus Zod mirrors of every interface in `transcend.ts` (`AssessmentSchema`, `RequestSchema`, `DataSiloSchema`, `CookieSchema`, `UserPreferencesSchema`, `ApiKeySchema`, `WorkflowSchema`, …).

**Breaking change (beta):** `createListResult` now nests pagination metadata (`count`, `totalCount`, `hasNextPage`, `nextCursor`, `paginationNote`) under `data` instead of placing it alongside `success` at the top level. List-tool consumers must update from `result.totalCount` to `result.data.totalCount`, `result.data` (the array) to `result.data.items`, etc. This unifies the envelope shape across list, get, and mutation tools.

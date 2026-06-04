---
"@transcend-io/mcp-server-inventory": patch
"@transcend-io/mcp-server-base": patch
---

Fix hardcoded pagination limits in `inventory_analyze`. The tool previously fetched only the first 100 data silos, vendors, identifiers, and categories and reported those capped array lengths as the totals, silently undercounting larger inventories. It now fully paginates all of these entities. This also fixes latent gaps where `liveDataSilos`, the outer-type breakdown, and identifier `isRequired` were always empty because those fields were never selected.

Pagination is centralized in a new `TranscendGraphQLBase.fetchAllPages()` helper that walks an offset-paginated `{ nodes, totalCount }` connection through the existing `makeRequest`. Every page therefore inherits the same behaviour as all other MCP GraphQL calls — per-request auth (stdio static API key / HTTP per-request session cookie), the proactive rate-limit throttle, request timeout, retry with backoff, and `ToolError`/`ErrorCode` classification — and the loop terminates on `offset >= totalCount`, which also guards against a backend that ignores `offset`. `ListOptions` gains an `all?: boolean` flag: `list*({ all: true })` returns the full result set via `fetchAllPages`, and `inventory_analyze` uses it instead of bespoke fetch-all queries. The `inventory_list_data_silos` and `inventory_list_identifiers` payloads now also include `isLive`/`outerType` and `isRequiredInForm` respectively.

Also fix broken pagination in the `inventory_list_*` tools (`data_silos`, `vendors`, `identifiers`, `data_points`, `categories`). They previously accepted a `cursor` that was silently ignored by the underlying queries, so every page returned the same first 100 results. They now use numeric `offset` pagination (matching `inventory_list_sub_data_points` and the consent list tools), with `hasNextPage` derived from `offset + page length < totalCount`.

---
'@transcend-io/mcp-server-assessment': major
'@transcend-io/mcp-server-discovery': major
'@transcend-io/mcp-server-workflows': major
'@transcend-io/mcp-server-admin': major
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

Remove the `cursor` parameter from the nine list tools whose API never paged by cursor,
and stop emitting a `$schema` pointer on every tool's input schema.

`PaginationSchema` pairs `limit` with `cursor`, so every tool that merged it advertised
cursor pagination whether or not its query supported one. Only `dsr_list` declares `$after`
and returns a real `endCursor`; `preferences_query` threads a cursor through the preference
store REST endpoint. In the other nine the value was passed to the client as `after`,
dropped before the request was built, and `hasNextPage` came back from a `pageInfo` that
never advanced. An agent handed `hasNextPage: true` would page forever on page one.

Dropped from `assessments_list`, `assessments_list_groups`, `assessments_list_templates`,
`discovery_list_plugins`, `discovery_list_scans`, `workflows_list`,
`workflows_list_email_templates`, `admin_list_teams` and `admin_list_api_keys`. Passing
`cursor` to any of these now fails schema validation rather than being silently ignored.

Descriptions were corrected to match. Several said "API does not support cursor pagination"
— true but unhelpful once the parameter is gone, and wrong for `admin_list_api_keys` and
`workflows_list_email_templates`, which have working `offset` pagination the text told
callers not to expect. Those two now say to page with `offset`; the rest state the `limit`
ceiling. The duplicated dashboard-URL sentence across the assessment tools was condensed to
one short form.

A registry test now pins the set of tools exposing `cursor` to `dsr_list` and
`preferences_query`, so a dead one cannot be reintroduced by merging `PaginationSchema`.

Separately, `toJsonSchemaCompat` stamps `"$schema": "http://json-schema.org/draft-07/schema#"`
onto every schema it produces, and both the umbrella registry and `buildMcpServer` were
forwarding it to clients verbatim. MCP already fixes the dialect for `inputSchema`, so those
50 characters told clients nothing, 82 times over. A new `toolInputSchema` helper in
`mcp-server-base` strips it at the two places descriptors are built, cutting about 4 KB from
every `tools/list` response.


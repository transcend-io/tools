---
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-discovery': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-preferences': patch
'@transcend-io/mcp-server-workflows': patch
'@transcend-io/mcp': patch
---

Return canonical `app.transcend.io` deep links from assessment tools so MCP
clients (Claude Desktop, Cursor, etc.) stop fabricating 404 URLs like
`/privacy-requests/assessments/:id`.

- `assessments_create`, `assessments_get`, `assessments_update`,
  `assessments_submit_response`, and `assessments_list` now include a single
  `url` field in their result payloads, always pointing at the form's
  read-only response page (`/assessments/forms/{id}/response`) — the same
  destination as the dashboard's "View Responses" row action, which works
  for any user with assessment view scope.
- `assessments_create_group` and `assessments_list_groups` include a
  `groupUrl` (`/assessments/groups/{id}`).
- Per-assessment tools intentionally do **not** return `groupUrl` as a
  sibling of `url`. When both were exposed, downstream LLM clients reliably
  surfaced `groupUrl` over `url` and every clicked link ended up at the
  parent group instead of the specific assessment. Group navigation lives
  on the dedicated group tools above.
- The fillable `/assessments/forms/{id}/view` route is also intentionally
  not surfaced — it 404s for anyone who isn't the form's assignee, which
  the MCP can't verify.
- Tool `description`s now instruct the model to surface the returned `url`
  / `groupUrl` verbatim instead of constructing URLs from raw IDs.
- `ToolClients` gains a `dashboardUrl` field (always
  `https://app.transcend.io` in production) plus new `DEFAULT_DASHBOARD_URL`
  and `resolveDashboardUrl` exports from `@transcend-io/mcp-server-base`.
- New optional `TRANSCEND_DASHBOARD_URL` env var overrides the dashboard
  base URL for testing against staging or local dashboards. Unset in
  production so we fall through to the canonical `app.transcend.io`.
- `assessmentGroupId` is now surfaced on the `Assessment` type via the
  underlying GraphQL queries, so callers can still navigate from a specific
  assessment to its parent group via the group tools.
- Standalone server CLIs (`mcp-server-admin`, `mcp-server-discovery`,
  `mcp-server-dsr`, `mcp-server-inventory`, `mcp-server-preferences`,
  `mcp-server-workflows`) were updated to accept the new `dashboardUrl`
  field on `CreateClientsArgs`. Runtime behavior is unchanged for everything
  except the assessment server, which now uses it to build deep links.

Fixes ZEL-7538.

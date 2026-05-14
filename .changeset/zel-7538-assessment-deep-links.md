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
  `assessments_submit_response`, and `assessments_list` now include `url`
  and (when known) `groupUrl` in their result payloads.
- `assessments_create_group` and `assessments_list_groups` include `groupUrl`.
- Tool `description`s now instruct the model to surface the returned `url`
  verbatim instead of constructing URLs from raw IDs.
- The primary `url` points at the form's read-only response page
  (`/assessments/forms/{id}/response`), which works for any user with
  assessment view scope. `IN_REVIEW` assessments link to the parent group
  page instead, matching the existing in-review email convention. The
  fillable `/view` route is intentionally not surfaced — it 404s for
  anyone who isn't the form's assignee, which the MCP can't verify.
- `ToolClients` gains a `dashboardUrl` field (always
  `https://app.transcend.io` in production) plus new `DEFAULT_DASHBOARD_URL`
  and `resolveDashboardUrl` exports from `@transcend-io/mcp-server-base`.
- New optional `TRANSCEND_DASHBOARD_URL` env var overrides the dashboard
  base URL for testing against staging or local dashboards. Unset in
  production so we fall through to the canonical `app.transcend.io`.
- `assessmentGroupId` is now surfaced on the `Assessment` type via the
  underlying GraphQL queries.
- Standalone server CLIs (`mcp-server-admin`, `mcp-server-discovery`,
  `mcp-server-dsr`, `mcp-server-inventory`, `mcp-server-preferences`,
  `mcp-server-workflows`) were updated to accept the new `dashboardUrl`
  field on `CreateClientsArgs`. Runtime behavior is unchanged for everything
  except the assessment server, which now uses it to build deep links.

Fixes ZEL-7538.

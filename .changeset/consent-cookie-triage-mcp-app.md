---
'@transcend-io/mcp-server-consent': minor
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
'@transcend-io/sdk': patch
'@transcend-io/cli': patch
---

Add an experimental consent cookie/data-flow triage MCP App, plus the list/delete tools it needs.

Reviewers had no interactive surface for clearing the cookie and data-flow backlog. The new
`consent_cookie_triage_review_app` tool opens a purpose-grouped review UI (MCP App hosts get a
fast shell that pages `consent_list_cookies` / `consent_list_data_flows`; other hosts get a
prefetched payload). Suggestions follow static business rules, not an agent classifier.

`consent_delete_cookies` and `consent_delete_data_flows` land alongside list-filter updates so
triage can discard items. SDK delete mutations now return `success`. Shared MCP UI gains
`useTool` for app views that call tools from the client.

CLI picks up a `stripAnsi` test helper so assertions stay stable under `FORCE_COLOR`.

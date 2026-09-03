---
'@transcend-io/mcp-server-assessment': major
'@transcend-io/mcp-server-discovery': major
'@transcend-io/mcp-server-workflows': major
'@transcend-io/mcp-server-inventory': major
'@transcend-io/mcp-server-consent': major
'@transcend-io/mcp-server-admin': major
'@transcend-io/mcp-server-dsr': major
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
'@transcend-io/sdk': patch
---

Consolidate every paginated tool onto two schemas, fix a `hasNextPage` bug that made
agents page forever, and give eight tools the paging they never had.

Pagination had drifted into three shared schemas and fourteen inline copies across 27
tools, producing four caller-facing conventions. `PaginationSchema` was marked deprecated
yet had eight users; `CursorPaginationSchema`, marked preferred, had none — not even
`dsr_list`, the one tool that genuinely pages by cursor.

Checking the GraphQL schema settled what shapes are actually needed. Of the list fields
the MCP servers query, 24 accept `first`/`offset` and return `nodes` plus `totalCount`
with no `pageInfo`; exactly one, `requests`, accepts `after` and returns a real
`pageInfo.endCursor`. So there are two shapes, and `CursorPaginationSchema` is for the
rare case rather than the default. Both now expose `limit` — 22 of 27 tools already used
that name, and `first` is the GraphQL wire name, which mixins map internally so Relay
vocabulary never reaches callers. `PaginationSchema` is deleted.

Because almost no payload carries a `pageInfo`, every mixin synthesized one, and they
disagreed. Eight wrote `nodeCount < totalCount`, which ignores where the page starts: on
the last page 20 rows against a total of 120 still compares true, so `hasNextPage` never
went false. An agent told to page until it did would loop until it exhausted its context.
That affected `assessments_list`, `assessments_list_groups`, `assessments_list_templates`,
`workflows_list`, `workflows_list_email_templates`, `admin_list_teams`,
`admin_list_api_keys` and `discovery_list_scans`. A shared `derivePageInfo` helper in
`mcp-server-base` now owns the comparison, and every offset-paginated mixin routes
through it.

Eight tools returned `hasNextPage: true` with no continuation parameter at all, because
their query documents never declared the `$offset` the schema has always accepted —
`ListApiKeysDoc` twelve lines below `ListTeamsDoc` declares it correctly. `admin_list_teams`,
`workflows_list`, `consent_list_purposes`, `discovery_list_scans`, `discovery_list_plugins`,
`assessments_list`, `assessments_list_groups` and `assessments_list_templates` now page.
This adds `$offset` to the shared `TranscendCliPurposes` query in the SDK, which is
backward compatible: the argument is optional and existing CLI callers are unaffected.

Tools renamed from `first` to `limit`: `dsr_list_identifiers`,
`dsr_list_request_data_silos`, `consent_list_cookies`, `consent_list_data_flows` and
`inventory_list_categories`. Nine tools drop a `cursor` parameter that was never wired to
anything. `preferences_query` keeps `limit`/`cursor` but not the shared bound, since its
REST endpoint caps a page at 50 rather than 100.

Descriptions no longer explain how to paginate — "Paginate with `offset` until
`hasNextPage` is false", "max 100", "Note: cursor pagination is not supported". The schema
already carries the bounds, defaults and parameter names, so that prose was spending
`tools/list` budget on every call to restate machine-readable facts. Removing it more than
paid for the eight tools that gained `offset`: the paginated surface costs 1,473 characters
less than on main, and the payload as a whole drops from 82,531 to 76,794 characters once
the per-schema `$schema` pointer goes too.

A new contract test asserts across the whole registry that no tool exposes `first` or
`after`, that no tool caps with `limit` without offering a continuation parameter, that
`limit` is bounded identically everywhere, and that descriptions do not restate paging
mechanics — plus unit coverage pinning the `derivePageInfo` termination cases.

Every paginated tool was also driven against a real org by hand while developing this
change, checking that each page is no larger than `limit`, that the continuation parameter
advances, that the last page reports `hasNextPage: false`, and that an offset past the end
does not promise another page. Of the 27 paginated tools, 25 pass every check,
`dsr_list_identifiers` has no rows in that org, and `preferences_query` needs a partition
no list call can supply. That probe was a throwaway harness rather than a committed test,
so nothing in the suite points at a live environment.

It caught something the mocked tests could not: `consent_list_regimes` returned four
rows for `limit: 3`. Probing the API directly showed `experiences` answers `first: n` with
`n + 1` rows at every size, and the tool forwarded that verbatim, so `limit` was a lie and
offset paging double-counted the seam. It now trims to `limit`, which keeps paging gapless
because the extra row is the one the next offset starts on.

The two `discovery_*` tools remain built on `dataSilos` and synthesize their rows, so
`discovery_list_scans` reports a hardcoded `COMPLETED` status and `discovery_list_plugins`
derives integration types per page. Their descriptions now say so rather than overclaiming;
repointing them at the real `discoClassScans` and `plugins` fields is follow-up work.

---
'@transcend-io/mcp-server-inventory': minor
'@transcend-io/mcp-server-base': minor
---

Put owners, teams and the API's filters on `inventory_list_data_silos`.

The list selected six scalars, so every ownership question — who owns this, which systems are
unassigned — had to be answered from `inventory_get_data_silo`, one call per silo. Triaging a
269-silo org meant 269 detail reads, each returning identifiers, subjects and vendor metadata
that the question never asked for.

Nothing about that was necessary: `dataSilos` returns `DataSiloBulkPreview`, which already
carries every field the singular `dataSilo` does. Rows now include `owners` (with email, the key
`inventory_write_data_silo` takes back) and `teams`, and an opt-in `includeDetails` adds
description, notes, connection state, country, contacts, vendor, business entities, silo-level
purposes and the classified-field count.

The tool also forwards `ids`, `types`, `ownerIds`, `teamIds`, `isLive`, `countries`, `vendorIds`,
`businessEntityIds` and two creation-date bounds to `DataSiloFiltersInput`, and sorts by `title`
or `createdAt`. `unassignedOnly` asks for systems with no owner via the schema's `includeNulls`
enum; there is deliberately no team equivalent, because `DataSiloNullableFilters` declares only
`OWNERS` — filter unassigned teams from the returned `teams` instead.

Left out on purpose: `plugins`, `connectionState`, `attributeValueIds`, `transferRegions`,
`controllerships`, `sensitiveCategoryIds` and `workflowConfigId`. They serve no ownership or
triage query and every parameter is always-loaded `tools/list` budget.

Two things read as bugs rather than results, and no longer do: an empty page from an `offset`
past the end is now a validation error naming `totalCount`, and an array filter must hold at
least one value, so a caller that resolved a lookup to nothing gets an error instead of every
system in the organization.

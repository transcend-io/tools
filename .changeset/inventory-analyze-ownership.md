---
'@transcend-io/mcp-server-inventory': minor
---

Report ownership coverage from `inventory_analyze`.

The tool already pages every silo, and now that `inventory_list_data_silos` returns owners and
teams it receives them for free. It reports `summary.dataSilosWithoutOwner` plus an `ownership`
block splitting `withoutOwner`, `withoutTeam` and `withoutOwnerOrTeam`, and a
`withoutOwnerByType` breakdown for sizing a rule like "one person owns the GCP systems" before
anyone starts assigning.

`withoutOwner` is the headline, and the breakdown groups over it, because it is the only one of
the three the API can filter on. Leading with `withoutOwnerOrTeam` would name a number no
follow-up call reproduces: a silo with a team but no named owner is excluded from it yet is
returned by `unassignedOnly`, so the summary and the list would disagree.

The counts are a triage entry point rather than an answer, so the response names its own
follow-up — `inventory_list_data_silos` with `unassignedOnly` for the set, and
`inventory_write_data_silo` to assign it.

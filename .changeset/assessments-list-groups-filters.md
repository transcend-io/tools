---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Let `assessments_list_groups` filter instead of paging.

The tool took nothing but `limit`, so resolving a group by name meant walking the whole catalog.
It now forwards `text`, `ids` and `templateIds` to `AssessmentGroupFiltersInput`, and pages with
`offset` rather than the `cursor` it advertised and never honored.

`text` matches a group's description as well as its title, so `AssessmentGroup` now carries
`description`. Without it a caller cannot see why a group it does not recognize came back, and
has no way to audit its own search.

Group rows are also the only route from a form to its template — `AssessmentFormRaw` reaches its
group but not its template — which is what makes `templateIds` worth having here and not on
`assessments_list`.

---
'@transcend-io/mcp-server-assessment': minor
---

Make `assessments_list_groups` searchable and pageable.

The tool said "List all assessment groups" while offering only `limit`, capped at 100, with
no filter and no way to reach page two. Its job is to turn a group name into the
`assessmentGroupId` that `assessments_create` needs, and in an organization with more than a
hundred groups it could not do that: an agent scanning the first page would either miss the
group or confidently pick the wrong one. This surfaced in a cold-read test where a model
holding only the tool list called it to find a "Vendor Onboarding" group and had no way to
narrow the search.

`assessmentGroups` accepts `offset` and an `AssessmentGroupFiltersInput` all along. The tool
now exposes `text` to match on group title and `templateIds` to restrict to groups built
from given templates, and pages with `offset`.

`hasNextPage` was also computed as `nodes.length < totalCount`, which reports another page
from the last page of any multi-page result. It is now `offset + nodes.length < totalCount`,
matching the fix made to `assessments_list`.

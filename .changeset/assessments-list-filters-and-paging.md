---
'@transcend-io/mcp-server-assessment': major
'@transcend-io/mcp-server-base': minor
---

Give `assessments_list` the filters, paging and sorting the API already supported.

`assessmentForms` accepts fifteen filter fields, an `offset`, and an `orderBy`. The tool
forwarded one of them. An agent asked "which DPIAs are overdue and still unapproved" had no
way to express that, so the honest options were to page the entire index and filter in the
model, or to answer from the first fifty rows and be wrong.

Now exposed, each mapped onto `AssessmentFormFiltersInput`: `statuses`, `text`, `ids`,
`assigneeIds`, `reviewerIds`, `externalAssigneeEmails`, `templateIds`, `assessmentGroupIds`,
and the `createdAfter` / `createdBefore` / `dueAfter` / `dueBefore` date bounds. Sorting is
`sortBy` (`title`, `status`, `submittedAt`) with `sortDirection`. `attributeValueIds` and
`riskLevelIds` are deliberately left out: no tool in this server lists attribute values or
risk levels, so an agent could not populate them, and an unfillable filter is the same
mistake as the cursor that never paged.

Paging is offset-based. `AssessmentFormsPayload` has `totalCount` but no `pageInfo`, so
`hasNextPage` is computed as `offset + nodes.length < totalCount`; the previous
`nodes.length < totalCount` reported another page from the last page of every multi-page
result.

Row shape is unchanged by default. `includeDetails` adds assignees, reviewers, external
assignees, due/updated/submitted dates and lock state, gated with `@include` so callers who
skip it do not pay for roughly triple the bytes per row. Every row now also carries
`assessmentGroupTitle`, which saves a second lookup to name the group.

Errors distinguish the three ways a listing can come back empty. An `offset` past the end
raises a `VALIDATION_ERROR` `ToolError` carrying `offset`, `totalCount` and the filters that
were applied, rather than returning an empty page that reads exactly like "nothing matched".
Zero results carry a note naming the applied filters and saying the query succeeded. Dates
are validated against ISO 8601 with a message naming the field and showing the format, and
`sortBy` rejects unknown columns by listing the valid ones.

BREAKING: the singular `status` argument is replaced by `statuses`, which takes a list.
Callers passing `status` now get an unknown-argument error instead of an unfiltered list.

`Assessment` in `mcp-server-base` gains `assessmentGroupTitle`, `externalAssignees`,
`isArchived` and `isLocked`, and its unused single `assignee` / `reviewer` fields become
`assignees` / `reviewers` arrays, matching `AssessmentFormRaw`, which has always returned
lists.

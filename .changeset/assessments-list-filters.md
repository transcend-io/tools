---
'@transcend-io/mcp-server-assessment': major
'@transcend-io/mcp-server-base': major
---

Give `assessments_list` the filters, sorting and paging the API already supports.

It previously accepted a single `status` and nothing else, so every other question — who owns
this, what is overdue, which forms belong to this group — meant paging the whole index and
matching in-model. It now forwards `text`, `ids`, `statuses`, `assigneeIds`, `reviewerIds`,
`externalAssigneeEmails`, `assessmentGroupIds` and four date bounds to
`AssessmentFormFiltersInput`, sorts by `title`, `status` or `submittedAt`, and pages with
`offset`.

Rows carry the group title alongside its ID, and an opt-in `includeDetails` fetches assignees,
reviewers, external assignees, dates and lock state — roughly triple the bytes per row, so a
caller who only wants titles and statuses does not pay for them.

There is deliberately no `templateIds` filter. `AssessmentFormFiltersInput` declares one and the
server rejects it: a form reaches its template only through its group. Resolve the group with
`assessments_list_groups` and filter on its ID.

Two things read as bugs rather than results, and no longer do: an empty page from an `offset`
past the end is now a validation error naming `totalCount`, and an array filter must hold at
least one value, so a caller that resolved a lookup to nothing gets an error instead of the
whole organization.

Breaking: `status` is replaced by `statuses`, and `Assessment` replaces the single `assignee`
and `reviewer` with the `assignees`, `reviewers` and `externalAssignees` lists the API returns.
`dueDate` is now explicitly `null` when unset rather than absent, since a dropped key reads as
broken plumbing behind `dueBefore`.

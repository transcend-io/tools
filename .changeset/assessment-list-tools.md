---
'@transcend-io/mcp-server-assessment': major
'@transcend-io/mcp-server-base': major
---

Give the three assessment list tools the filters, paging and sorting the API already supported.

`assessmentForms` accepts fifteen filter fields, an `offset` and an `orderBy`; the tool
forwarded one. An agent asked "which DPIAs are overdue and still unapproved" had to page the
whole index and filter in the model, or answer from the first fifty rows and be wrong.
`assessments_list` now takes `statuses`, `text`, `ids`, `assigneeIds`, `reviewerIds`,
`externalAssigneeEmails`, `assessmentGroupIds` and the `createdAfter` / `createdBefore` /
`dueAfter` / `dueBefore` bounds, ordered by `sortBy` and `sortDirection`. `attributeValueIds`
and `riskLevelIds` are left out: no tool here lists attribute values or risk levels, so an agent
could not populate them. `templateIds` is left out too — `assessmentForms` declares the field
and then rejects it, since a form reaches its template only through its group, and emulating it
is not worth the machinery until we see callers asking template-scoped questions. Rows stay
compact by default, with `includeDetails` adding assignees, reviewers, dates and lock state;
every row now carries `assessmentGroupTitle`, which saves a lookup to name the group.

Every list filter rejects `[]`. Empty arrays are dropped during filter assembly, so a caller
that resolved a lookup to nothing and passed the result through had its filter read as "no
filter given" and got back every row in the organization — the widest possible answer to a query
that should have matched none. That is now a validation error naming the field.

`assessments_list_groups` and `assessments_list_templates` were both "list all", capped at 100
with no filter and no route to page two, which is useless for their actual job of turning a
name into an id. Groups now takes `text`, `ids` and `templateIds`; templates takes `text`,
`ids` and `statuses`. Both page with `offset`. The dashboard also filters templates by source,
creator and last editor, and those are deliberately left out: a catalog of tens of rows is
cheaper to match in-model than the ~980 characters they cost in shared `tools/list` budget.

The templates mapper also fabricated three fields it never fetched: `version: '1.0.0'`,
`isActive: true` and `createdAt: new Date().toISOString()`. Every template reported itself as
created at the moment of the call, which an agent asked which templates are new would answer
confidently and wrongly. The query now fetches the real `status`, `source`, `isArchived`,
`createdAt` and `updatedAt`.

`hasNextPage` was `nodes.length < totalCount` on all three, claiming another page from the last
page of every multi-page result. It is now `offset + nodes.length < totalCount`.

Empty is no longer ambiguous. An `offset` past the end raises a `VALIDATION_ERROR` carrying
`offset`, `totalCount` and the filters that were applied; zero matches carry a note naming
those filters and saying the query succeeded. Dates are validated against ISO 8601 with a
message naming the field, and `sortBy` rejects unknown columns by listing the valid ones.

Descriptions were corrected against cold-read tests, then cut back to what an input schema
cannot express. `assessments_prefill` claimed to "AI-prefill all the answers" when every answer
comes from the caller's own `answers` map. `assessments_create` described `templateId` as
resolving "the first matching group", which quietly creates the assessment in the wrong one
where several groups share a template; it now says to prefer `assessmentGroupId`.
`assessments_list_groups` gained the only documented route from a form to its template — pass
its `assessmentGroupId` as `ids` and read `assessmentFormTemplate` — which is where two
independent cold-read tests had given up.

`mcp-server-base` also exports `describeNoMatches`, which builds that empty-result note, so
other servers can stop returning bare empty pages. Nothing outside the assessment lists uses it
yet.

BREAKING: `assessments_list` replaces the singular `status` argument with `statuses`, which
takes a list. In `mcp-server-base`, `AssessmentTemplate` drops `version` and `isActive`, which
existed only to hold those invented values, and `Assessment`'s single `assignee` / `reviewer`
fields become `assignees` / `reviewers` arrays, matching what `AssessmentFormRaw` has always
returned.

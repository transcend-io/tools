---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

Add `assessments_list_comments`, and have `assessments_get` count feedback rather than carry it.

Reviewer feedback on an assessment had no tool of its own. Nothing in the catalog carried
"comment" or "feedback" in its name, so "what did the reviewer ask us to change" retrieved
nothing.

The new tool returns form, section and question comments in one call, each row naming what it
sits on: section rows carry `sectionTitle`, and question rows carry `questionTitle` plus the
`sectionId` and `sectionTitle` of the section holding them, so grouping feedback by section
costs no second read. Filter by `authorIds`, by `levels`, and by `resolution`, which defaults
to `OPEN` so the common "what is still being asked of us" read costs nothing extra.

`assessments_get` now reports only a `commentSummary`: a `totalCount` and a `totalByLevel`
split, counted at every level whether or not sections were expanded, so the number does not
change meaning with the arguments.

Comments got their own tool rather than a flag on `assessments_get` because they need their own
paging — `limit` and `offset` there page sections, not comments. Paging here is over the merged
list, ordered by creation time then id, since bulk review passes produce comments sharing a
timestamp that would otherwise let one offset name a different comment on each call.

An `offset` past the end raises a `VALIDATION_ERROR` naming the total, matching
`assessments_list`, rather than returning an empty page that reads as "this form has no
feedback".

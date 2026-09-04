---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Bound what `assessments_get` returns, and move assessment feedback to `assessments_list_comments`.

`assessments_get` previously returned every section, question, answer option and selected
answer in one response. A modest six-section, twenty-question DPIA already serialized to
roughly 30,000 characters, two thirds of it answer options and selected answers, and forms
run to hundreds of questions. Neither `sections`, `questions`, nor the nested question
`comments` field accepts pagination arguments in the API, so nothing about that was
recoverable by paging.

The tool now reads in two steps. Called without `sectionIds` it returns the section list
with a question count for each, which is small enough to be safe on any form. Passing
`sectionIds` expands just those sections in full.

Reviewer feedback moves out to a new `assessments_list_comments`. It returns comments from
all three levels in one call — on the form, on a section, or on a single question — each
row saying which, and question comments carrying the title of the question they sit on. It
filters by `authorIds`, and by whether a comment is still open through `resolution`, which
defaults to `OPEN` so the common "what is still being asked of us" read costs nothing
extra.

Splitting it fixes the shape rather than just adding a filter. Feedback had become a second
mode wearing the same schema: `includeComments`, `includeResolvedComments`, `limit` and
`offset` were all meaningless unless comments were asked for, `limit`/`offset` paged the
comments rather than the sections they sat beside, and `sectionIds` quietly did double duty
as both the section expander and the switch that admitted question-level comments at all.
That last one made `totalCount` mean different things on different calls — a bare read
reported one number and an expanded read a larger one, with nothing in the field name to
say so.

`assessments_get` now reports `commentSummary` with a `totalCount` and a `byLevel` split
across form, section and question, counted at every level whether or not sections were
expanded, so the number no longer changes meaning with the arguments. Counts come from
`totalCount` alone and fetch no comment bodies.

Paging in the new tool is over the merged list. The three levels come from separate
queries, so each source is read out in full and the result ordered by creation time then id
before a page is cut — creation time alone is not a total order, and bulk review passes
produce comments sharing a timestamp that would otherwise be free to swap places between
calls and make an offset name a different comment each time.

This also fixes comments going missing without saying so: form and section comments were
previously fetched with a fixed `first: 100`, so a form with more than that lost the
remainder at the fetch layer while the reported omission count stayed at zero.

Question comments come from a lean query on the form rather than the
`assessmentQuestionComments` root query, because `AssessmentQuestionComment` carries no
question ID, so a batched root query could say what feedback exists while losing which
question it was left on. That query asks for question id, title and comments only, and so
carries none of the answer text that makes a full form read expensive.

Two smaller fixes: a missing assessment now raises a `NOT_FOUND` `ToolError` naming
`assessments_list` instead of a bare `Error`, and the `assessmentName` argument, which was
accepted but never read, is gone.

Breaking twice for callers of `assessments_get`: it no longer returns full section contents
by default, so pass `sectionIds` to restore that; and it no longer returns comments at all,
so read them with `assessments_list_comments`.

---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Add `assessments_list_comments`, and have `assessments_get` count feedback rather than carry it.

Reviewer feedback on an assessment — the comments left during review of a PIA, DPIA or
vendor questionnaire — had no tool of its own. Nothing in the catalog carried the words
"comment" or "feedback" in its name, so "what did the reviewer ask us to change" retrieved
nothing.

The new tool returns comments from all three levels in one call — on the form, on a section,
or on a single question — each row saying which, and question comments carrying the title of
the question they sit on so that "which question is this about" costs no second call. It
filters by `authorIds`, and by whether a comment is still open through `resolution`, which
defaults to `OPEN` so the common "what is still being asked of us" read costs nothing extra.

Putting feedback in its own tool fixes its shape rather than just adding a filter to
`assessments_get`. Feedback would otherwise have been a second mode wearing that tool's
schema: `includeComments`, `includeResolvedComments`, `limit` and `offset` all mean nothing
unless comments are asked for, `limit`/`offset` would page the comments rather than the
sections they sit beside, and `sectionIds` would do double duty as both the section expander
and the switch admitting question-level comments at all. That last one makes a comment total
mean different things on different calls — a bare read reports one number and an expanded
read a larger one, with nothing in the field name to say so.

So `assessments_get` reports only a `commentSummary`: a `totalCount` and a `byLevel` split
across form, section and question, counted at every level whether or not sections were
expanded, so the number does not change meaning with the arguments. Counts read `totalCount`
alone and fetch no comment bodies.

Paging is over the merged list. The three levels come from separate queries, so each source
is read out in full and the result ordered by creation time then id before a page is cut —
creation time alone is not a total order, and bulk review passes produce comments sharing a
timestamp that would otherwise be free to swap places between calls and make an offset name
a different comment each time.

Question comments come from a lean query on the form rather than the
`assessmentQuestionComments` root query, because `AssessmentQuestionComment` carries no
question ID, so a batched root query could say what feedback exists while losing which
question it was left on. That query asks for question id, title and comments only, and so
carries none of the answer text that makes a full form read expensive. `authorIds` is a
filter input on the form and section queries but not on that nested field, so the same match
on author id is applied in the client for question comments.

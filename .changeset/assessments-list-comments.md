---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
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

Each row names what it sits on: section comments carry `sectionTitle`, and question comments
carry `questionTitle` along with the `sectionId` and `sectionTitle` of the section holding
them, so "which part of the form is this about" costs no second call. That last pair matters
more than it looks: a question comment holds no route back to a section and neither does the
question, so grouping feedback by section otherwise meant reading the form twice — once for
the section list and again with every section expanded, pulling back all the question and
answer text purely to rebuild an id-to-section lookup. The query behind question comments
already selects the sections it walks through, so naming them costs nothing on the wire. The
per-level breakdown is called `totalByLevel` rather than `byLevel` because it counts the
whole filtered set, not the page — sitting beside `returned`, the shorter name read as a
page breakdown, and a cold-read probe misread it that way.

An `offset` past the end raises a `VALIDATION_ERROR` naming the total, matching
`assessments_list`. It previously returned an empty page that read exactly like "this form
has no feedback", which is the wrong thing to report to a user. A filter that genuinely
matches nothing still comes back as a success carrying `noMatches`.

`levels` narrows to feedback left on the form, on a section, or on a question. Without it,
"what did reviewers say about the answers" meant paging past every form-level comment first:
the three levels are merged into one list ordered by creation time, so a form carrying
hundreds of comments on itself buries the handful left on its questions. A level nobody asked
for is not queried at all, so narrowing also costs fewer round trips than reading everything.

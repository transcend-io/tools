---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Bound what `assessments_get` returns, so reading a form no longer means reading all of it.

The tool previously returned every section, question, answer option and selected answer in
one response. A modest six-section, twenty-question DPIA already serialized to roughly
30,000 characters, two thirds of it answer options and selected answers, and real forms run
to hundreds of questions. Neither `sections` nor `questions` accepts pagination arguments in
the API, so none of that was recoverable by paging — the only way to bound it is to not ask
for it.

It now reads in two steps. Called with just `assessmentId` it returns the section list with
a question count for each, which is small enough to be safe on any form and is enough to
decide what is worth opening. Passing `sectionIds` expands only those sections, in full.

A `sectionIds` list containing an ID the form does not have now fails, rather than quietly
returning the sections that did match. Previously the call only failed when *none* of the
IDs matched, so a caller who asked for four sections and mistyped one got three back in a
response shaped exactly like a complete one, with nothing to say a section was dropped. The
error names the missing IDs and lists the sections the form does have.

A free-text answer is also no longer returned twice. The API has no separate field for a
typed response, so it models one as an answer option — the same paragraph came back under
both `answerOptions` and `selectedAnswers`, byte for byte. The options are now dropped when
every one of them was selected, which is exactly the case where they say nothing the answers
do not. Select questions are unaffected: the choices a respondent passed over are real
information and still come back.

Two smaller fixes: a missing assessment now raises a `NOT_FOUND` `ToolError` naming
`assessments_list` instead of a bare `Error`, so a caller that guessed an ID is told where
to find a real one; and the `assessmentName` argument, which was accepted but never read, is
gone.

Breaking for callers that relied on full section contents by default; pass `sectionIds` to
restore that.

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

Two smaller fixes: a missing assessment now raises a `NOT_FOUND` `ToolError` naming
`assessments_list` instead of a bare `Error`, so a caller that guessed an ID is told where
to find a real one; and the `assessmentName` argument, which was accepted but never read, is
gone.

Breaking for callers that relied on full section contents by default; pass `sectionIds` to
restore that.

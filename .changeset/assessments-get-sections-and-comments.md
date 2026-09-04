---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Surface assessment comments in `assessments_get`, and bound what the tool returns.

`assessments_get` previously returned every section, question, answer option and selected
answer in one response. A modest six-section, twenty-question DPIA already serialized to
roughly 30,000 characters, two thirds of it answer options and selected answers, and forms
run to hundreds of questions. Neither `sections`, `questions`, nor the nested question
`comments` field accepts pagination arguments in the API, so nothing about that was
recoverable by paging.

The tool now reads in two steps. Called without `sectionIds` it returns the section list
with a question count for each, which is small enough to be safe on any form. Passing
`sectionIds` expands just those sections in full.

`includeComments` adds reviewer feedback on top. Form-level comments always come back;
section- and question-level comments come back only for expanded sections, which is what
keeps a heavily-reviewed form bounded. Resolved comments are hidden unless
`includeResolvedComments` is set.

Comments are paged with `limit` and `offset`, which move through the comments rather than
the sections. The three comment levels come from separate queries and are merged, so each
source is read out in full and the merged list ordered by creation time and id before a
page is cut — an offset names the same comment on every call. `commentSummary` reports
`totalCount` and a `pageInfo`.

This also fixes comments going missing without saying so: form and section comments were
previously fetched with a fixed `first: 100`, so a form with more than that lost the
remainder at the fetch layer while the reported omission count stayed at zero.

Question comments are returned once, in the paged `comments` list, rather than also inline
on each question. The inline copy answered no offset, so it disagreed with the page beside
it and double-counted anything that read both. `commentSummary.resolvedHidden` reports how
many resolved comments were filtered out rather than just that filtering happened.

Question comments come from the nested field on the form query rather than the
`assessmentQuestionComments` root query, because `AssessmentQuestionComment` carries no
question ID and a batched root query cannot attribute its results.

Two smaller fixes: a missing assessment now raises a `NOT_FOUND` `ToolError` naming
`assessments_list` instead of a bare `Error`, and the `assessmentName` argument, which was
accepted but never read, is gone.

Breaking for callers that relied on `assessments_get` returning full section contents by
default; pass `sectionIds` to restore that.

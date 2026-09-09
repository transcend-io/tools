---
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-base': minor
---

Bound what `assessments_get` returns.

It returned every section, question, answer option and answer at once — a six-section,
twenty-question DPIA already ran to roughly 30,000 characters, and real forms have hundreds of
questions. Neither `sections` nor `questions` takes pagination arguments, so the only way to
bound the response is not to ask for the parts you do not want.

`assessmentId` alone now returns the section list with a question count each. `sectionIds`
expands the sections you name, and fails naming any ID the form does not have rather than
returning the rest in a response shaped like a complete one.

Free-text answers no longer come back twice. The API models a typed response as an answer
option, so the same paragraph appeared under both `answerOptions` and `selectedAnswers`.
Options are now dropped only when every one was selected, so select questions are unaffected.

Also: a missing assessment raises a `NOT_FOUND` `ToolError` naming `assessments_list` instead
of a bare `Error`, and the `assessmentName` argument, accepted but never read, is gone.

Breaking: pass `sectionIds` to get full section contents.

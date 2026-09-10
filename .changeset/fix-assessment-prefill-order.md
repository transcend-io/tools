---
'@transcend-io/mcp-server-assessment': minor
---

Fix `assessments_prefill` losing answers.

**Answers were written before the form could accept them.** A form takes no answer until it is
assigned: the API moves it `DRAFT` → `SHARED` on assignment and `SHARED` → `IN_PROGRESS` on
answering. The tool assigned *after* answering, so every answer was rejected and the errors only
reached `results`. With `submitForReview` that sent an empty form to a reviewer and reported
`success: true, answersApplied: 0`; without an assignee it failed and named no form, leaving one
orphaned. Assignment now happens straight after create, and `assigneeIds` or `assigneeEmails` is
required and checked before anything is created.

**Answers keyed by `referenceId` never matched.** The tool documents `referenceId` as a key and
`assessments_export_template` leads with it, but the form read never selected the field, so that
comparison ran against `undefined`. A caller following the documented path got zero answers applied
on a form that had already been created and assigned.

**Half-matching multi-selects lost values.** Matched options were written on their own and the
remaining values discarded while the question still reported as answered, so
`["Usage data", "Location data"]` against a list missing the latter stored one of the two. Matches
and custom values now go in one call, and the description no longer claims select values must match
the option text exactly — an unmatched value is kept as a custom answer.

Failures are now distinguishable from choices. An answer key naming no question is reported in
`unmatchedAnswerKeys` and fails the call. A question the caller simply left blank is not a failure
and is named in `unansweredQuestions` instead, since leaving one for a human is often the right
call on a compliance record. Because the tool only creates, failures point at
`assessments_answer_question` and `assessments_submit_response` rather than a retry that would
build a second form.

Every failure after the form exists names it, with its `url` and how many answers landed, so a
half-built form can be finished rather than abandoned. `submitForReview` with only external
assignees is rejected up front, since submitting acts as the calling user. Error codes live in one
place, each paired with its `retryable` flag. `includeDetails` returns the per-question rows.

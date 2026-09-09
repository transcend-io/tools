---
'@transcend-io/mcp-server-assessment': minor
---

Fix `assessments_prefill` writing answers before the form can accept them.

A form must be assigned before it will take an answer: the API moves it `DRAFT` → `SHARED` on
assignment, and writing an answer moves it `SHARED` → `IN_PROGRESS`. The tool assigned *after*
answering, so every answer was rejected with "Cannot update the assessment form status from
DRAFT to IN_PROGRESS", and the per-question errors were recorded in `results` without failing
the call.

With `submitForReview`, that submitted an empty form for review and reported
`success: true, answersApplied: 0`. Without an assignee, submit failed instead and the error
named no form, leaving one orphaned in the group.

Assignment now happens immediately after create, `assigneeIds` or `assigneeEmails` is required
and checked before anything is created, and the form is re-read after prefilling — any question
still unanswered fails the call with `ASSESSMENT_PREFILL_INCOMPLETE` and never submits.

Every failure after the form exists now names it, so a half-built form can be read with
`assessments_get` and finished rather than abandoned for a second attempt. This also covers
failures in the notification step, which previously aborted the call without naming what it built.

Submitting acts as the calling user, so `assigneeEmails` alone cannot submit — external assignees
can answer a form but not submit it. That is now stated on the argument and in the submit failure.

`includeDetails` returns the per-question rows, which are otherwise summarized as counts.

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
and checked before anything is created, and the form is re-read after prefilling to confirm the
answers landed.

Answers keyed by `referenceId` now match. The tool documents `referenceId` as a key and
`assessments_export_template` leads with it, but the form read never selected the field and the
mapper dropped it, so that arm compared against `undefined` and every `referenceId`-keyed answer
missed. A caller following the documented path got zero answers applied on a form that had already
been created and assigned. The identifier is unchanged from template to form, so keying by it now
works as described — and it is the stable choice, since titles break when a template is reworded.

A multi-select where only some values match an option keeps both halves. Matched options were
written on their own and the remaining values dropped, while the question still reported as
answered — so asking for `["Usage data", "Location data"]` against a list without the latter
silently stored one of the two. Matches and custom values are now sent together.

The `answers` description no longer says select values "must match the option text exactly", which
was never what the code did: an unmatched value is recorded as a custom answer. Callers believed
the stricter wording and left real content out rather than risk it being dropped. It now also
points at `referenceId` as the key to prefer, since titles break when a template is reworded.

That re-read distinguishes an answer that failed from a question nobody answered. Answer keys are
matched against the form, so a key naming no question was never visited and its answer vanished
with an empty `errors` array to explain it — one dropped `?` in a question title silently cost an
answer. Unmatched keys are now reported in `unmatchedAnswerKeys` and fail the call with
`ASSESSMENT_PREFILL_INCOMPLETE`, alongside answers the API rejected.

A question the caller simply supplied no answer for is no longer a failure. Leaving one blank for
a human is often correct on a compliance record, and calling it an error told the caller to go
back and invent a value. Those questions are named in `unansweredQuestions` on the success
payload instead, so a partial fill is visible rather than either silent or fatal.

`assessments_prefill` only creates, so "retry" would have built a second form. The failure now
names `assessments_answer_question` and `assessments_submit_response` as the way to finish the
form that already exists.

Every failure after the form exists now names it, so a half-built form can be read with
`assessments_get` and finished rather than abandoned for a second attempt. This also covers
failures in the notification step, which previously aborted the call without naming what it built.

Submitting acts as the calling user, so `assigneeEmails` alone cannot submit — external assignees
can answer a form but not submit it. `submitForReview` without `assigneeIds` is now rejected up
front rather than after a form has been created and filled in.

Failures also report how far the prefill got. "Created but submitting failed" does not say whether
the form holds every answer or none, which is the difference between finishing it and starting
over.

The response carries the form's `url`, so a caller no longer needs a second read to link to what
it just built.

The tool's error codes now live in one place, each paired with its `retryable` flag so two call
sites cannot give opposite retry advice under one code. The missing-group error gained a code and
a flag, having shipped with neither. The assignee guard split in two, since the remedies differ:
one code for no assignee at all, and a new
`ASSESSMENT_PREFILL_INTERNAL_ASSIGNEE_REQUIRED` for submitting with only external ones.

`includeDetails` returns the per-question rows, which are otherwise summarized as counts.

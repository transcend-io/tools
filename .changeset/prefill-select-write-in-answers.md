---
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-base': patch
---

`assessments_prefill` no longer loses select answers when a value matches none of the question's answer options.

A select question holds at most one written-in answer, so sending each unmatched value as its own was rejected outright. Because the matched options and the written-in values travelled in a single write, that rejection discarded the matched options too, leaving the question blank on a form that reported itself filled. Unmatched values are now joined into a single written-in answer, separated by semicolons since the values themselves often contain commas.

Where a question takes no written-in answer, such values cannot be stored at all, so they come back under `missedOptionValues` with the form's `questionId` and the options the question does accept, including their IDs, ready to hand to `assessments_answer_question`. Whether a question takes one is read from `allowSelectOther`, which the form query now selects; `subType` does not imply it, as a `CUSTOM` select with the flag off refuses a written value.

Joining changes what the form says, so it is now reported rather than left to be discovered: the response carries `answersJoined` beside the counts, the message says so in words, and each detailed row reports the options a select actually holds and its written-in value instead of replaying the request. Rows also carry `questionId`, which is what `assessments_answer_question` needs and what answers keyed by `referenceId` do not give you.

The failure message no longer mentions answer keys unless a key actually failed to match, and `ASSESSMENT_PREFILL_INCOMPLETE` is no longer marked retryable: the form already exists, so retrying the call creates a second one.

---
'@transcend-io/mcp-server-assessment': patch
---

Correct four assessment tool descriptions that misdirected cold-read agents.

These came out of running models that held only the `tools/list` payload — no source, no
prior calls — against realistic requests, and watching where they went wrong.

`assessments_prefill` claimed to "AI-prefill all the answers". It does no such thing: every
answer comes from the caller's `answers` map. The description now says the answers are the
caller's to provide and nothing is generated. The answer-format rules it used to carry moved
onto the `answers` parameter, along with where the keys come from, which was never stated.

`assessments_create` described `templateId` as resolving "the first matching group". In an
organization where several groups share a template that quietly creates the assessment in the
wrong one. It now says to prefer `assessmentGroupId` and never to use `templateId` when the
user named a specific group.

An agent asked for the oldest assessments, or which templates are new, concluded the tool
could not answer. Both already return `createdAt`, and neither API supports a date sort. That
now lives on the parameter rather than in the description: `sortBy` on `assessments_list` says
the API offers no creation-date sort, and `assessments_list_templates` has no sort parameter to
mislead. Row shape is left to the first response, which carries it.

`assessments_list_groups` gains the one thing no input schema can express, since it is a fact
about the response: to reach the template behind a form, pass its `assessmentGroupId` as `ids`
and read `assessmentFormTemplate`. Two cold-read tests gave up at exactly that step.

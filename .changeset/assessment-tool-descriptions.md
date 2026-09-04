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

`assessments_list` and `assessments_list_templates` did not say what their rows contain, so
an agent asked for the oldest assessments, or which templates are new, concluded the tool
could not answer. Both already return `createdAt`; neither API supports a date sort, so the
descriptions now name the fields on each row and say to order by `createdAt` client-side.
Naming `assessmentGroupId` on `assessments_list` rows also completes the documented path to
`assessments_export_template`, whose first hop was previously described only from the far end
in `assessments_list_groups`.

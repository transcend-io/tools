---
'@transcend-io/mcp-server-assessment': patch
---

Correct what `assessments_create` and `assessments_prefill` say they do.

Both let a caller pass `templateId` instead of `assessmentGroupId`, which resolves to whichever
group happens to be first among those sharing that template. `assessments_prefill` called that
"will auto-resolve", and `assessments_create` stated it as plain fact, so an agent holding a
template id had no reason to prefer the group. Where several groups share a template, that
quietly creates the assessment in the wrong one. Both parameters now say to prefer
`assessmentGroupId`, resolved by name through `assessments_list_groups`.

`assessments_prefill` also claimed to "AI-prefill all the answers" when every answer comes from
the caller's own `answers` map, and did not say where the keys come from.

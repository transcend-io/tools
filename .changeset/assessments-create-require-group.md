---
'@transcend-io/mcp-server-assessment': patch
---

`assessments_create` now takes the assessment group as given and no longer accepts `templateId`.

`templateId` was a fallback that looked for a group built from that template. It only ever worked when exactly one such group existed, and when none existed it failed with "No assessment group found", pointing at a tool that lists groups rather than creates them. Pass `assessmentGroupId`, found by name with `assessments_list_groups`, and create one with `assessments_create_group` if no group is built from the template you want.

`assigneeIds` now explains why it is worth passing: a new assessment is `DRAFT` and rejects answers until it is assigned.

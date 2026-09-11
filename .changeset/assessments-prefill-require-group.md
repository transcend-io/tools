---
'@transcend-io/mcp-server-assessment': patch
---

`assessments_prefill` now takes the assessment group as given and no longer accepts `templateId`, matching `assessments_create`.

`templateId` was a fallback that looked for a group built from that template, and it only ever worked when exactly one such group existed. Agents reached for it because they already hold a template ID from `assessments_export_template` for the answers map, and hit a dead end whenever no group had been created yet. Pass `assessmentGroupId`, found by name with `assessments_list_groups`, and create one with `assessments_create_group` if none is built from the template you want.

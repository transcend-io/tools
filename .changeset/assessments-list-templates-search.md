---
'@transcend-io/mcp-server-assessment': major
'@transcend-io/mcp-server-base': major
---

Make `assessments_list_templates` searchable, and stop inventing template metadata.

The tool offered only `limit`, capped at 100. Every workflow that starts from a template
name — "create an assessment from the Vendor Onboarding template", "send me the blank vendor
questionnaire" — had to scan pages it could not page through. `assessmentFormTemplates`
accepts `offset` and an `AssessmentFormTemplateFiltersInput` all along, so the tool now takes
`text`, `ids` and `statuses`, and pages with `offset`.

More seriously, the mapper fabricated three fields it never fetched: `version: '1.0.0'`,
`isActive: true`, and `createdAt: new Date().toISOString()`. That last one reported every
template in the organization as created at the moment of the call, which an agent asked
"which templates are new?" would answer confidently and wrongly. The query now fetches the
real `status`, `isArchived`, `createdAt` and `updatedAt`.

BREAKING: `AssessmentTemplate` in `mcp-server-base` drops `version` and `isActive`, which
existed only to hold those invented values and were read by nothing. It gains `status` and
`isArchived`, and `createdAt` becomes optional because it now reflects whether the API
returned one.

`hasNextPage` was also `nodes.length < totalCount`, which claims another page from the last
page of any multi-page result; it is now `offset + nodes.length < totalCount`, matching the
other assessment lists.

`assessments_list_groups` additionally gains an `ids` filter. Combined with the template link
already on each group row, that documents the only path from an assessment to the template it
was built from: `AssessmentFormRaw` reaches its group but not its template, so callers take
`assessmentGroupId` off an `assessments_list` row, pass it as `ids` here, and read
`assessmentFormTemplate`. Two independent cold-read tests of the tool descriptions gave up at
this step, having no documented route from an assessment to a `templateId`.

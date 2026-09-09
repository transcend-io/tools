---
'@transcend-io/mcp-server-assessment': major
'@transcend-io/mcp-server-base': major
---

Let `assessments_list_templates` filter, and stop inventing the fields it returns.

The tool took nothing but `limit`, so finding a template by name meant paging the catalog. It now
forwards `text`, `ids` and `statuses` to `AssessmentFormTemplateFiltersInput`, and pages with
`offset`.

Rows carry the real `status`, `source`, `isArchived`, `createdAt` and `updatedAt`. The mapper
previously hardcoded `version: '1.0.0'`, `isActive: true` and `createdAt: new Date()`, which
reported every template in the organization as created today and active — three fields that were
never anything but fiction.

The description said templates are what you build assessments from, without saying that only
`PUBLISHED` ones can be, so a caller could pick a draft and fail at create time.

Breaking: `AssessmentTemplate` drops `version` and `isActive`, and `createdAt` is now optional
since it comes from the API rather than the clock.

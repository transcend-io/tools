# @transcend-io/mcp-server-dsr

## 0.0.3

### Patch Changes

- @transcend-io/privacy-types@5.1.2

## 0.0.2

### Patch Changes

- Updated dependencies [ebc2e91]
- Updated dependencies [8984fb5]
  - @transcend-io/privacy-types@5.1.1

## 0.0.1

### Patch Changes

- 29868af: refactor: deduplicate enums and replace inline strings with shared privacy-types

  Add CookieOrderField, DataFlowOrderField, DataFlowType, TriageAction, and ConsentTrackerType enums to privacy-types. Replace z.string() tool params with proper enum types (ScopeName, AssessmentFormTemplateStatus). Enrich admin_create_api_key with TRANSCEND_SCOPES metadata.

- Updated dependencies [a15fed8]
- Updated dependencies [8185679]
- Updated dependencies [29868af]
  - @transcend-io/privacy-types@5.1.0
  - @transcend-io/mcp-server-core@0.1.0

---
'@transcend-io/privacy-types': minor
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-assessments': patch
---

refactor: deduplicate enums and replace inline strings with shared privacy-types

Add CookieOrderField, DataFlowOrderField, DataFlowType, TriageAction, and ConsentTrackerType enums to privacy-types. Replace z.string() tool params with proper enum types (ScopeName, AssessmentFormTemplateStatus). Enrich admin_create_api_key with TRANSCEND_SCOPES metadata.

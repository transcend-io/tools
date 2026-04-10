---
'@transcend-io/privacy-types': minor
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-assessments': patch
'@transcend-io/mcp-server-preferences': patch
---

refactor: deduplicate enums and replace inline strings with shared privacy-types

Add CookieOrderField, DataFlowOrderField, DataFlowType, TriageAction, and ConsentTrackerType enums to privacy-types. Deduplicate z.nativeEnum wrappers into shared schemas files. Replace z.string() tool params with proper enum types (ScopeName, IdentifierType, AssessmentFormTemplateStatus).

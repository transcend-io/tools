---
'@transcend-io/privacy-types': minor
---

Add `DsrErrorCode.TypeNotMatchingWorkflow` and `DsrErrorCode.SubjectTypeNotMatchingWorkflow` with parameterized `DSR_ERROR_MESSAGE` builders, emitted when a bulk DSR submission asserts a `type` or `subjectType` that does not match the targeted workflow config.

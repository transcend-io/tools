---
'@transcend-io/privacy-types': minor
---

Add `DsrErrorCode.RequestIdAlreadyExists` with its `DSR_ERROR_MESSAGE` builder, emitted when a bulk DSR submission reuses an existing `requestId` without `isRestart: true`.

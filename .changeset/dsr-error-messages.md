---
'@transcend-io/privacy-types': minor
---

Publish canonical DSR submission error codes, message builders, numeric limits, and `DsrRequestOutcome`. Per-input failures use `DsrErrorCode` with `DSR_ERROR_MESSAGE`; bulk-call failures use `DsrBulkErrorCode` with `DSR_BULK_ERROR_MESSAGE`.

`DsrErrorCode` landed in 5.9.0, but no endpoint has ever emitted any of its values. `OPEN_PARENT_REQUEST_EXISTS`, `DUPLICATE_REQUEST`, and `INVALID_INPUT` never had producers (`DUPLICATE_REQUEST` becomes `DsrRequestOutcome.AlreadyOpen` on bulk instead of an error; former `INVALID_INPUT` cases now have dedicated codes). No consumer can depend on removed members. Strict semver would call removing them breaking; this note is what makes the minor bump defensible.

---
'@transcend-io/privacy-types': minor
---

Publish canonical DSR submission error codes, message builders, numeric limits, and `DsrRequestOutcome`. Each failure type has its own `DsrErrorCode` and a matching `DSR_ERROR_MESSAGE` builder.

`DsrErrorCode` landed in 5.9.0, but no endpoint has ever emitted any of its values. `OPEN_PARENT_REQUEST_EXISTS` and `DUPLICATE_REQUEST` never had producers (`DUPLICATE_REQUEST` becomes `DsrRequestOutcome.AlreadyOpen` on bulk instead of an error). No consumer can depend on either removed member. Strict semver would call removing them breaking; this note is what makes the minor bump defensible.

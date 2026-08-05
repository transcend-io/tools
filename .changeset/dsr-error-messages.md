---
'@transcend-io/privacy-types': minor
---

Publish canonical DSR submission error codes, message builders, numeric limits, and `DsrRequestOutcome`. Each failure type has its own `DsrErrorCode` and a matching `DSR_ERROR_MESSAGE` builder.

`DsrErrorCode` landed in 5.9.0, but no endpoint has ever emitted any of its values. `OPEN_PARENT_REQUEST_EXISTS` never had a producer, so no consumer can depend on it. Strict semver would call removing it breaking; this note is what makes the minor bump defensible.

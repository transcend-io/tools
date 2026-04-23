---
"@transcend-io/sdk": minor
"@transcend-io/cli": patch
"@transcend-io/utils": patch
---

Retry transient gateway errors on Sombra REST reads so large `transcend request export` and `transcend cron pull-identifiers` runs ride through occasional 502 / 503 / 504 / 429 / network resets from the reverse tunnel instead of aborting a chunk.

- Add a generalised `withTransientRetry` (and `isTransientError`) helper in `@transcend-io/sdk` under `api/`. Exponential backoff with jitter, retries on known-transient message substrings (`ECONNRESET`, `ETIMEDOUT`, `bad gateway`, `gateway timeout`, etc.) _and_ known-transient HTTP status codes (408, 425, 429, 500, 502, 503, 504) so `got` HTTPErrors are caught even when their message is generic.
- `fetchAllRequestIdentifiers` (used by `transcend request export`) now wraps `POST /v1/request-identifiers` in `withTransientRetry` with `maxAttempts: 6` and `baseDelayMs: 500`. Fixes WAL-9783.
- `pullCronPageOfIdentifiers` (used by `transcend cron pull-identifiers`) applies the same retry wrapper around its Sombra `GET` for the same reason.
- **Breaking:** the preference-scoped aliases `withPreferenceRetry` and `RETRY_PREFERENCE_MSGS` are removed. Callers should import `withTransientRetry` / `RETRY_TRANSIENT_MSGS` from `@transcend-io/sdk` directly (the underlying implementation is unchanged).
- `extractErrorMessage` now summarises HTML gateway bodies (`<html>...502 Bad Gateway...</html>`) as `HTTP 502 Bad Gateway` when a status code is available, and caps raw non-JSON bodies at ~200 characters so failures surface cleanly in CLI output instead of dumping the whole HTML page.

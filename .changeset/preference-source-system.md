---
"@transcend-io/privacy-types": minor
---

Add optional `sourceSystem` (non-empty, max 128 chars via `SourceSystemLabel`) and optional per-purpose `timestamp` to `PreferenceStorePurposeResponse`, which flows into `PreferenceStorePurposeUpdate` for PUT `/v1/preferences` and preference query responses (PIK-8191).

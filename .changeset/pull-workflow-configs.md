---
'@transcend-io/cli': minor
'@transcend-io/sdk': minor
'@transcend-io/privacy-types': minor
---

Add workflow-configs pull and push support for DSR workflow settings. Sync matches by required, unique `internal-name` and creates missing DSR workflows (then updates remaining fields). `action-type` is required; note that changing a workflow's action type creates a new workflow version server-side. Supports title, subtitle, description, data subject, visibility, region collection, region list, per-region expiry times (requires a `default` entry with all values > 0), and attribute keys. Pull is filtered to DSR workflows (preference-management workflows are excluded).

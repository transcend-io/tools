---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp-server-dsr': minor
'@transcend-io/mcp': minor
---

Switch `dsr_submit` / `TranscendRestClient.submitDSR` to `POST /v1/data-subject-request-bulk`. Callers pass `workflowConfigId` instead of `type`/`subjectType`; the API derives those from the published workflow config. Returns a minimal summary (`id`, `status`, `type`, `subjectType`, `link`) for each created request. DSR OAuth scopes now include `ViewWorkflows` so clients can list published workflow configs for submit.

---
'@transcend-io/mcp-server-dsr': minor
'@transcend-io/mcp': minor
---

Remove `dsr_submit_on_behalf`. DSR creation goes solely through `dsr_submit` → customer-ingress REST (`POST /v1/data-subject-request`), where Sombra attests the subject server-side. The GraphQL `employeeMakeDataSubjectRequest` create path (without `dhEncrypted`) is no longer exposed as an MCP tool.

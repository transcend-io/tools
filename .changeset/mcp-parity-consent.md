---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-consent': minor
'@transcend-io/mcp': minor
---

Add `consent_write_consent_manager` and `consent_write_purposes`. They push the consent-manager and purposes sections of `transcend.yml` without a file on disk. The consent server now also requests the developer settings and preference store scopes. Shared `decodeYmlItems` helper is exported from the base package for yml codec validation.

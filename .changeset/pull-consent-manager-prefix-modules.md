---
"@transcend-io/sdk": minor
"@transcend-io/cli": minor
---

`transcend pull` now writes the Airgap prefix modules attached to your consent manager bundle to `consent-manager.prefixModules` in `transcend.yml`. Each entry has the module name, catalog, version, and config. This field is pull only: `transcend push` ignores it.

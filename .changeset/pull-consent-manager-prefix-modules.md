---
"@transcend-io/sdk": minor
"@transcend-io/cli": minor
"@transcend-io/privacy-types": minor
---

`transcend pull` now writes the Airgap prefix modules attached to your consent manager bundle to `consent-manager.prefixModules` in `transcend.yml`. Each entry has the module name, catalog, version, and a string-to-string config map. This field is pull only: `transcend push` ignores it.

`@transcend-io/privacy-types` exports shared prefix module catalog and config types.

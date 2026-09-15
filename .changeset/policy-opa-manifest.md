---
'@transcend-io/cli': major
---

Breaking: Policy projects now use an OPA `.manifest` file instead of `manifest.json`.

Rename existing `manifest.json` files to `.manifest`. `policy init` generates the OPA schema shape (including `roots` and `rego_version`), and editor setup associates `.manifest` with JSON.

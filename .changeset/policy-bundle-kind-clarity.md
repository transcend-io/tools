---
'@transcend-io/cli': minor
---

Clarify how Permissions vs generic policy bundles are distinguished at publish time: scaffolded `.manifest` files now include `metadata.transcend.io.template`, docs explain that Permissions Evaluate only loads the remote bundle named `permissions`, and `policy publish` soft-warns when `--bundle-name` disagrees with that convention.

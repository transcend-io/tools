---
'@transcend-io/privacy-types': minor
'@transcend-io/cli': patch
---

Permissions policy input: add optional `topics` to each `preferences[]` entry so policies can evaluate topic-level choices (`{ name, choice }`, where `choice` is a boolean, single-select value, multi-select values, or null). Regenerates `schema/permissions-policy-input.json`.

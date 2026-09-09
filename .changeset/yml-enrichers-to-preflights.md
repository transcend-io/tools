---
'@transcend-io/cli': minor
'@transcend-io/sdk': patch
---

Rename the `transcend.yml` `enrichers` key to `preflights`.

The legacy `enrichers` key still parses and is marked deprecated in the JSON Schema.
`inventory pull` writes `preflights` going forward.

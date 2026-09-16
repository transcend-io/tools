---
'@transcend-io/cli': patch
---

`policy eval` now ignores local `*_test.rego` files by default (same as lint/publish), so local Evaluate matches production bundles that do not ship tests.

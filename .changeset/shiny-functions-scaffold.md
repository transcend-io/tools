---
'@transcend-io/cli': minor
'@transcend-io/custom-function-types': minor
---

Add transactional, credential-free `custom-functions init`, `new`, and `check` workflows with deterministic General and DSR starters, safe optional repository setup, and a portable AI authoring skill.

Initialize once with `custom-functions init`; `custom-functions new` now has a focused interface that only adds functions to an existing manifest.

Choose init integrations directly with individual flags; interactive setup starts with every option selected.

Allow raw DSR datapoint fixtures to omit the data-silo identity that `push` injects, and export the exact authoring-contract package version for generated Deno imports.

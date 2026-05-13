---
"@transcend-io/airgap.js-types": minor
---

Add `package.json` `exports` subpath pattern `"./*"` so consumers can import built modules by path (for example `@transcend-io/airgap.js-types/constants`, `@transcend-io/airgap.js-types/core`, `@transcend-io/airgap.js-types/ui`, `@transcend-io/airgap.js-types/enums/purpose`). Wildcard entries omit the `@transcend-io/source` condition because strict publint cannot validate glob source paths. Add a package-local `.attw.json` with `profile` `node16` so `check:exports` ignores TypeScript `moduleResolution` `node10`, which does not resolve `exports` subpaths.

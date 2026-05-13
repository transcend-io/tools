---
"@transcend-io/airgap.js-types": minor
---

Add `package.json` `exports` subpaths `./constants` and `./core` so consumers can import from `@transcend-io/airgap.js-types/constants` and `@transcend-io/airgap.js-types/core`. Add a package-local `.attw.json` with `profile` `node16` so `check:exports` stays meaningful: TypeScript `moduleResolution` `node10` cannot resolve `exports` subpaths.

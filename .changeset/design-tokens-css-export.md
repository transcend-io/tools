---
'@transcend-io/design-tokens': patch
---

Resolve `@transcend-io/design-tokens/tokens.css` from source inside this monorepo by giving the export an `@transcend-io/source` condition, matching the package's main entry. Published consumers still read `dist/tokens.css`. Terrazzo rewrites `src/tokens.css` in place, whereas tsdown copies it into a `dist/` it has just cleaned, so a package importing the stylesheet could fail to resolve it while design-tokens happened to be rebuilding.

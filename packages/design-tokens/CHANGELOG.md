# @transcend-io/design-tokens

## 1.1.1

### Patch Changes

- dfec990: Resolve `@transcend-io/design-tokens/tokens.css` from source inside this monorepo by giving the export an `@transcend-io/source` condition, matching the package's main entry. Published consumers still read `dist/tokens.css`. Terrazzo rewrites `src/tokens.css` in place, whereas tsdown copies it into a `dist/` it has just cleaned, so a package importing the stylesheet could fail to resolve it while design-tokens happened to be rebuilding.

## 1.1.0

### Minor Changes

- 943af98: Export CSS custom properties via `@transcend-io/design-tokens/tokens.css`, including `--token` aliases for `--token-default` values

## 1.0.0

### Major Changes

- 88babce: Initial release

# @transcend-io/design-tokens

## 1.2.1

### Patch Changes

- 99a0110: Update chart yellow and lime semantic colors to darker palette steps (`yellow.600`, `lime.600`) from the latest Figma DTCG export.

## 1.2.0

### Minor Changes

- 77ef86f: Add semantic typography tokens and export raw DTCG JSON for custom token pipelines.

  ### Added
  - Semantic typography styles (`display`, `heading`, `body`, `label`, `metric`, `code`) as `typography.light.*` / CSS vars such as `--display-lg-font-size` and the `font` shorthand `--display-lg`
  - Font-family fallback stacks on typography tokens (e.g. `Figtree, system-ui, sans-serif`)
  - Gray accent tokens for text, border, background, and chart
  - Palette / semantic color refresh from the latest Figma DTCG export
  - Raw DTCG sources as package exports (`@transcend-io/design-tokens/tokens`, `…/tokens/primitive/*.json`, `…/tokens/semantic/*.json`) for consumers running their own token pipelines

## 1.1.1

### Patch Changes

- dfec990: Resolve `@transcend-io/design-tokens/tokens.css` from source inside this monorepo by giving the export an `@transcend-io/source` condition, matching the package's main entry. Published consumers still read `dist/tokens.css`. Terrazzo rewrites `src/tokens.css` in place, whereas tsdown copies it into a `dist/` it has just cleaned, so a package importing the stylesheet could fail to resolve it while design-tokens happened to be rebuilding.

## 1.1.0

### Minor Changes

- 943af98: Export CSS custom properties via `@transcend-io/design-tokens/tokens.css`, including `--token` aliases for `--token-default` values

## 1.0.0

### Major Changes

- 88babce: Initial release

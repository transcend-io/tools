---
'@transcend-io/design-tokens': minor
---

Add semantic typography tokens and export raw DTCG JSON for custom token pipelines.

### Added

- Semantic typography styles (`display`, `heading`, `body`, `label`, `metric`, `code`) as `typography.light.*` / CSS vars such as `--display-lg-font-size` and the `font` shorthand `--display-lg`
- Font-family fallback stacks on typography tokens (e.g. `Figtree, system-ui, sans-serif`)
- Gray accent tokens for text, border, background, and chart
- Palette / semantic color refresh from the latest Figma DTCG export
- Raw DTCG sources as package exports (`@transcend-io/design-tokens/tokens`, `…/tokens/primitive/*.json`, `…/tokens/semantic/*.json`) for consumers running their own token pipelines

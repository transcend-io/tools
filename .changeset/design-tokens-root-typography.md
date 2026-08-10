---
'@transcend-io/design-tokens': major
---

Add semantic typography tokens and keep rest-state color groups on named `default` leaves (no draft DTCG `$root`).

### Breaking

Rest-state values for stateful color groups live under an explicit `.default` segment again. Terrazzo compile still adds `toString()` on those groups and short CSS aliases (`--foo` → `var(--foo-default)`), so interpolations and common CSS vars stay ergonomic without adopting preview-draft `$root`:

- `background.default` / `background.neutral` rest values → `….default`
- `background.{brand,success,warning,danger}.bold` rest values → `….bold.default`
- `link.visited` rest value → `link.visited.default`

CSS custom properties follow the same shape: rest state is `--background-brand-bold-default` with alias `--background-brand-bold`. Named category leaves like `--text-default` are unchanged.

### Added

- Semantic typography styles (`display`, `heading`, `body`, `label`, `metric`, `code`) as `typography.light.*` / CSS vars such as `--display-lg-font-size` and the `font` shorthand `--display-lg`
- Font-family fallback stacks on typography tokens (e.g. `Figtree, system-ui, sans-serif`)
- Gray accent tokens for text, border, background, and chart
- Palette / semantic color refresh from the latest Figma DTCG export
- Raw DTCG sources as package exports (`@transcend-io/design-tokens/tokens`, `…/tokens/primitive/*.json`, `…/tokens/semantic/*.json`) for consumers running their own token pipelines

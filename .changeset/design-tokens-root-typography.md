---
'@transcend-io/design-tokens': major
---

Adopt DTCG `$root` for stateful color groups and add semantic typography tokens.

### Breaking

Rest-state leaves that used a nested `.default` segment are gone. Terrazzo flattens `$root` onto the parent ID, so the rest value lives at the shorter path (and still stringifies via `toString()` for styled-components):

- `background.default.default` → `background.default`
- `background.neutral.default` → `background.neutral`
- `background.{brand,success,warning,danger}.bold.default` → `background.*.bold`
- `link.visited.default` → `link.visited`

CSS custom properties follow the same shape: `--background-brand-bold-default` is now `--background-brand-bold` (states remain `--background-brand-bold-hovered`, etc.). Named category leaves like `--text-default` are unchanged.

### Added

- Semantic typography styles (`display`, `heading`, `body`, `label`, `metric`, `code`) as `typography.light.*` / CSS vars such as `--display-lg-font-size` and the `font` shorthand `--display-lg`
- Font-family fallback stacks on typography tokens (e.g. `Figtree, system-ui, sans-serif`)
- Gray accent tokens for text, border, background, and chart
- Palette / semantic color refresh from the latest Figma DTCG export
- Raw DTCG sources as package exports (`@transcend-io/design-tokens/tokens`, `…/tokens/primitive/*.json`, `…/tokens/semantic/*.json`) for consumers running their own token pipelines

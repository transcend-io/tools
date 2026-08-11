# @transcend-io/design-tokens

Centralized design token primitives and semantic tokens for Transcend frontends.

## Usage

TypeScript theme objects:

```typescript
import { color, palette, typography } from '@transcend-io/design-tokens';
import type { ColorMode, SemanticColors } from '@transcend-io/design-tokens';

color.light.text.default;
color.light.background.brand.bold; // rest state via toString() → .default
typography.light.display.lg.fontSize;
```

CSS custom properties on `:root`:

```css
@import '@transcend-io/design-tokens/tokens.css';

.button {
  color: var(--text); /* alias of --text-default */
  background: var(--background-brand-bold); /* alias of --background-brand-bold-default */
  font-size: var(--display-lg-font-size);
}
```

Raw DTCG JSON (resolver + token files) for custom pipelines:

```ts
import resolver from '@transcend-io/design-tokens/tokens' with { type: 'json' };
import palette from '@transcend-io/design-tokens/tokens/primitive/palette.tokens.json' with { type: 'json' };
import color from '@transcend-io/design-tokens/tokens/semantic/color.tokens.json' with { type: 'json' };
import typography from '@transcend-io/design-tokens/tokens/semantic/typography.tokens.json' with { type: 'json' };
```

## Development

Token source lives in `tokens/` (DTCG JSON) and is published as package subpaths. Terrazzo generates TypeScript and `tokens.css` into `src/` on `prebuild`, and `build` copies the stylesheet to `dist/`:

```bash
pnpm --filter @transcend-io/design-tokens build
pnpm --filter @transcend-io/design-tokens check:tokens
```

Both exports carry the `@transcend-io/source` condition, so a build inside this monorepo reads `src/` and a consumer reads `dist/`. For `./tokens.css` that is not only about skipping a build step: `build` empties `dist/` before restoring the stylesheet, so anything watching for changes — a `vite build --watch` over an MCP App view, say — sees `dist/tokens.css` briefly missing whenever this package is rebuilt, and fails to resolve the import. `src/tokens.css` is rewritten in place and never disappears.

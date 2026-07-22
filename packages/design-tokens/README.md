# @transcend-io/design-tokens

Centralized design token primitives and semantic tokens for Transcend frontends.

## Usage

TypeScript theme objects:

```typescript
import { color, palette } from '@transcend-io/design-tokens';
import type { ColorMode, SemanticColors } from '@transcend-io/design-tokens';
```

CSS custom properties on `:root`:

```css
@import '@transcend-io/design-tokens/tokens.css';

.button {
  color: var(--text);
  background: var(--background-brand-bold); /* same as --background-brand-bold-default */
}
```

## Development

Token source lives in `tokens/` (DTCG JSON). Terrazzo generates TypeScript and `tokens.css` into `src/` on `prebuild`:

```bash
pnpm --filter @transcend-io/design-tokens build
pnpm --filter @transcend-io/design-tokens check:tokens
```

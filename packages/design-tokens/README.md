# @transcend-io/design-tokens

Centralized design token primitives and semantic tokens for Transcend frontends.

## Usage

```typescript
import { color, palette } from '@transcend-io/design-tokens';
import type { ColorMode, SemanticColors } from '@transcend-io/design-tokens';
```

## Development

Token source lives in `tokens/` (DTCG JSON). Terrazzo generates TypeScript into `src/` on `prebuild`:

```bash
pnpm --filter @transcend-io/design-tokens build
pnpm --filter @transcend-io/design-tokens check:tokens
```

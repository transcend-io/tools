import { defineConfig } from 'tsdown';

import sharedConfig from '../../../tsdown.config.mcp.ts';

export default defineConfig({
  ...sharedConfig,
  // `src/ui/index.ts` is a browser-only entry, published as the `./ui` subpath so
  // view code never resolves through the Node-only root barrel.
  // `src/transcend-yml/index.ts` is a separate build entry for the `./transcend-yml`
  // export (`dist/transcend-yml/index.mjs`); tsdown does not infer that from package.json.
  entry: ['src/index.ts', 'src/ui/index.ts', 'src/transcend-yml/index.ts'],
  // Copied rather than bundled: a consuming view imports this from its own
  // stylesheet, so Tailwind reads it as CSS and never as a module.
  copy: [{ from: 'src/ui/theme.css', to: 'dist/ui' }],
});

import { defineConfig } from 'tsdown';

import sharedConfig from '../../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  // `src/ui/index.ts` is a browser-only entry, published as the `./ui` subpath so
  // view code never resolves through the Node-only root barrel.
  entry: ['src/index.ts', 'src/ui/index.ts'],
});

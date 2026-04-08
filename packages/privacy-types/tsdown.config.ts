import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
  deps: {
    alwaysBundle: ['@transcend-io/type-utils', '@transcend-io/internationalization'],
  },
});

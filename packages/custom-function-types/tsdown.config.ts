import { defineConfig } from 'tsdown';

import sharedConfig from '../../tsdown.config.base.ts';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
  copy: [
    { from: 'src/__generated__/monaco', to: 'dist/generated' },
    { from: 'src/__generated__/schemas', to: 'dist/generated' },
  ],
});
